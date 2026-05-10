const SERVICE_DOMAIN = (process.env.SERVICE_DOMAIN ?? "").trim();

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Build the public-facing URL for a service.
 *
 * When SERVICE_DOMAIN is set, services are exposed at
 * `https://{serviceId}.{SERVICE_DOMAIN}` (subdomain origin).
 * Otherwise falls back to the legacy path-prefix form.
 */
export function buildServiceUrl(_baseUrl: string, serviceId: string): string {
  if (SERVICE_DOMAIN) {
    const protocol = SERVICE_DOMAIN === "localhost" ? "http" : "https";
    return `${protocol}://${serviceId}.${SERVICE_DOMAIN}`;
  }
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/s/${serviceId}`;
}
