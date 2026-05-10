/**
 * Thin client for Caddy's admin API + service public URL construction.
 *
 * Used by the service worker to:
 *   1. Build the correct public URL for a service (subdomain or path-based)
 *   2. Push / delete reverse-proxy routes to Caddy whenever a Deno service
 *      is spawned or stopped.
 *
 * All Caddy failures are soft – if Caddy is unreachable we log a warning
 * and move on so the service itself is never blocked by a routing issue.
 */

const CADDY_ADMIN_URL = process.env.CADDY_ADMIN_URL ?? "http://caddy:2019";

/**
 * When set, services are exposed at `{protocol}://{serviceId}.{SERVICE_DOMAIN}`
 * instead of the legacy `/api/s/{serviceId}` path-prefix form.
 *
 * Examples:
 *   SERVICE_DOMAIN=localhost       → http://f0f207b0.localhost
 *   SERVICE_DOMAIN=app.example.com → https://f0f207b0.app.example.com
 */
const SERVICE_DOMAIN = (process.env.SERVICE_DOMAIN ?? "").trim();

/**
 * Build the public-facing URL for a service.
 *
 * If SERVICE_DOMAIN is configured the URL uses the subdomain form
 * (which requires wildcard DNS + Caddy or equivalent reverse proxy).
 * Otherwise it falls back to the legacy path-prefix form.
 */
export function buildServicePublicUrl(serviceId: string): string {
  if (!SERVICE_DOMAIN) {
    // Legacy path-based URL – works without any DNS / proxy changes.
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3141";
    return `${base}/api/s/${serviceId}`;
  }

  const protocol = SERVICE_DOMAIN === "localhost" ? "http" : "https";
  return `${protocol}://${serviceId}.${SERVICE_DOMAIN}`;
}

/** Whether subdomain routing is enabled (SERVICE_DOMAIN is set). */
function isSubdomainRoutingEnabled(): boolean {
  return SERVICE_DOMAIN.length > 0;
}

/** Format the Caddy @id used to reference a service route. */
function routeId(serviceId: string): string {
  return `service-${serviceId}`;
}

/**
 * Register a reverse-proxy route so that
 * `{serviceId}.{SERVICE_DOMAIN}` forwards to `worker:{port}`.
 *
 * This is a no-op when SERVICE_DOMAIN is not configured.
 */
export async function registerServiceRoute(
  serviceId: string,
  port: number,
): Promise<void> {
  if (!isSubdomainRoutingEnabled()) return;

  const host = `${serviceId}.${SERVICE_DOMAIN}`;
  const payload = {
    "@id": routeId(serviceId),
    match: [{ host: [host] }],
    handle: [
      {
        handler: "reverse_proxy",
        upstreams: [{ dial: `worker:${port}` }],
      },
    ],
    terminal: true,
  };

  try {
    // Delete any existing route first (ignore failures – it may not
    // exist yet), then create a fresh one.  This is idempotent and
    // handles both first-time registration and re-spawn after restart.
    await fetch(
      `${CADDY_ADMIN_URL}/id/${encodeURIComponent(routeId(serviceId))}`,
      { method: "DELETE", headers: { Origin: "http://worker" } },
    ).catch(() => {});

    const res = await fetch(
      `${CADDY_ADMIN_URL}/config/apps/http/servers/srv0/routes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://worker",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[caddy] Failed to register route for ${host} → worker:${port} (${res.status}): ${body}`,
      );
    } else {
      console.log(`[caddy] ✅ Registered route: ${host} → worker:${port}`);
    }
  } catch {
    console.warn(
      `[caddy] Could not reach Caddy admin API at ${CADDY_ADMIN_URL} – route for ${host} not registered. ` +
        `This is expected if Caddy is not running (e.g. behind Coolify / another proxy).`,
    );
  }
}

/**
 * Remove a previously registered route for the given service.
 *
 * This is a no-op when SERVICE_DOMAIN is not configured.
 */
export async function unregisterServiceRoute(serviceId: string): Promise<void> {
  if (!isSubdomainRoutingEnabled()) return;

  const id = routeId(serviceId);

  try {
    const res = await fetch(`${CADDY_ADMIN_URL}/id/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Origin: "http://worker" },
    });

    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[caddy] Failed to unregister route ${id} (${res.status}): ${body}`,
      );
    } else if (res.ok) {
      console.log(`[caddy] 🗑️  Unregistered route: ${id}`);
    }
  } catch {
    console.warn(
      `[caddy] Could not reach Caddy admin API to unregister ${id}.`,
    );
  }
}

/**
 * Re-register routes for all currently running services.
 * Called on worker startup to recover from a Caddy restart.
 *
 * No-op when SERVICE_DOMAIN is not configured.
 */
export async function recoverAllRoutes(
  services: Array<{ id: string; port: number | null; status: string }>,
): Promise<void> {
  if (!isSubdomainRoutingEnabled()) return;

  for (const svc of services) {
    if (svc.status === "running" && svc.port) {
      await registerServiceRoute(svc.id, svc.port);
    }
  }
}
