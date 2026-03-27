export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function buildServiceUrl(baseUrl: string, serviceId: string): string {
  return `${baseUrl}/api/s/${serviceId}`;
}
