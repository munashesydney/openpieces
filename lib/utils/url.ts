const SERVICE_DOMAIN = (process.env.SERVICE_DOMAIN ?? "").trim();

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Build the public-facing URL for a service.
 *
 * When SERVICE_DOMAIN is set, services are exposed at
 * `https://{serviceId}.{SERVICE_DOMAIN}` (subdomain origin).
 * When SERVICE_DOMAIN=localhost the app port is appended
 * (e.g. http://{id}.localhost:3141) since Next.js runs on a
 * non-standard port in dev.
 */
export function buildServiceUrl(_baseUrl: string, serviceId: string): string {
  if (SERVICE_DOMAIN) {
    const protocol = SERVICE_DOMAIN === "localhost" ? "http" : "https";
    const port =
      SERVICE_DOMAIN === "localhost"
        ? `:${process.env.APP_PORT ?? "3141"}`
        : "";
    return `${protocol}://${serviceId}.${SERVICE_DOMAIN}${port}`;
  }
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/s/${serviceId}`;
}
