# Wildcard SSL for Service Subdomains (Coolify / Traefik)

OpenPieces services run on subdomains (`{id}.yourdomain.com`). When your domain is itself a subdomain (e.g. `op.yourdomain.com`), services live at `{id}.op.yourdomain.com` — a "sub-subdomain" wildcard that Cloudflare's free tier won't cover.

This guide sets up **free wildcard SSL** for `*.op.yourdomain.com` using Let's Encrypt DNS-01 challenge via Traefik.

## Prerequisites

- Coolify with Traefik proxy
- A **Cloudflare API token** with `Zone:DNS:Edit` permission on your domain
- A wildcard DNS record `*.op.yourdomain.com` → your VPS IP

### Create a Cloudflare API token

1. Go to [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token** → use the **Edit zone DNS** template
3. Under **Zone Resources**, restrict it to your specific domain (e.g. `munashesydney.com`)
4. Copy the token — you'll need it in the next step

---

## Step 1: Add DNS Challenge to the Traefik Proxy

> **Coolify users:** Servers → your server → Proxy
>
> **Standalone Traefik:** wherever your Traefik `docker-compose.yml` lives (e.g. `/opt/traefik/docker-compose.yml`).

Find the existing HTTP challenge lines in the `command:` section:

```yaml
      - '--certificatesresolvers.letsencrypt.acme.httpchallenge=true'
      - '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=http'
```

Replace them with these **three new lines**:

```yaml
      - '--certificatesresolvers.letsencrypt.acme.dnschallenge=true'
      - '--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare'
      - '--certificatesresolvers.letsencrypt.acme.email=you@example.com'
```

Replace `you@example.com` with your real email (Let's Encrypt uses this for certificate expiry notices).

Also add the Cloudflare API token as an environment variable. Find the `restart: unless-stopped` line under `services → traefik`, and add an `environment:` block right after it:

```yaml
    restart: unless-stopped
    environment:
      - CF_DNS_API_TOKEN=<your Cloudflare API token>
```

Save and restart the proxy.

---

## Step 2: Set Up the App Container

The routing and TLS configuration is handled entirely by labels on the `app` service — no dynamic config file needed.

In your app's `docker-compose.yml`, set the `SERVICE_DOMAIN` and `SERVICE_DOMAIN_REGEX_ESCAPED` environment variables, and the existing Traefik labels will handle the rest. See the [README](../README.md#4-subdomain-routing-required) for details.

Once the proxy is restarted, Traefik will:

1. Use DNS-01 challenge to prove ownership of `op.yourdomain.com`
2. Route all service subdomains (`{id}.op.yourdomain.com`) to your app via the `HostRegexp` label

### Important: Pre-request the wildcard certificate

Traefik's ACME provider can only extract domains from `Host()` rules, not from `HostRegexp()`. This means the wildcard router in your app labels won't proactively request `*.op.yourdomain.com` at startup — you need a `Host()` rule to tell Traefik which certificate you want.

Since your Traefik proxy is already configured with a `--providers.file.directory=/traefik/dynamic/`, you can drop in a static config file that pre-requests the wildcard cert:

**Create `/data/coolify/proxy/dynamic/wildcard-pre-request.yml`** (or wherever your dynamic config directory lives):

```yaml
# Pre-request wildcard certificate so all {id}.op.yourdomain.com subdomains
# have valid SSL from the moment they're created. The router uses
# `noop@internal` so it won't intercept real traffic — the higher-priority
# HostRegexp label on the app container handles actual routing.
http:
  routers:
    pre-request-op-wildcard:
      entryPoints:
        - https
      rule: Host(`wildcard-pre-request.op.yourdomain.com`)
      service: noop@internal
      tls:
        certResolver: letsencrypt
        domains:
          - main: "*.op.yourdomain.com"
            sans:
              - "op.yourdomain.com"
```

Replace `op.yourdomain.com` with your base domain in both `rule:` and `domains:`.

Save the file and restart the Traefik proxy. Traefik will:

1. Parse the file on startup (it watches `/traefik/dynamic/`)
2. See the `domains` list explicitly requesting `*.op.yourdomain.com`
3. Immediately kick off the DNS-01 challenge and issue the wildcard certificate

From that point on, every `{id}.op.yourdomain.com` subdomain will have valid HTTPS without any warmup requests.

> **Note:** Add one file per project if you run multiple environments (e.g. `wildcard-pre-request-dev.yml` for `*.dev.yourdomain.com`). Each gets its own wildcard certificate.

---

## Troubleshooting

**Wildcard certificate never issued ("Serving default certificate" or "No domain parsed"):**
- This means the wildcard cert was never pre-requested. Create the dynamic config file described in Step 2 and restart the proxy.
- You can confirm with `docker logs coolify-proxy --tail 50 | grep "No domain parsed.*HostRegexp"` — if you see that line, Traefik can't extract a domain from your `HostRegexp` rule and needs the static file to know which cert to request.

**Certificate not issuing:**
- Check that the Cloudflare API token has `Zone:DNS:Edit` permission on the correct zone
- The email address is required by Let's Encrypt — don't skip it
- DNS propagation can be slow; if challenges fail immediately, add:
  ```yaml
  - '--certificatesresolvers.letsencrypt.acme.dnschallenge.delaybeforecheck=30'
  ```

**Test without burning rate limits:**
Add the staging server temporarily, then remove once it works:
```yaml
- '--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory'
```
