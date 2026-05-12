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
2. Issue a wildcard certificate covering `*.op.yourdomain.com`
3. All service subdomains (`{id}.op.yourdomain.com`) will now have valid HTTPS

---

## Troubleshooting

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
