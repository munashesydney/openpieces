import type { ToolContext } from "@/lib/tools/registry";
import type { CallEndpointInput } from "./definition";
import { getEndpointByIdForWorkspace } from "@/lib/services/service-endpoint.service";
import { getServiceById } from "@/lib/services/service.service";

const SERVICE_HOST = process.env.SERVICE_HOST ?? "http://localhost";

function parseJsonField(val: unknown): Record<string, unknown> | string {
  if (typeof val === "string") {
    // Try to parse as JSON object/array; if it looks like a plain string (no braces), return as-is
    const trimmed = val.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }
  if (typeof val === "object" && val !== null) {
    return val as Record<string, unknown>;
  }
  return val as string;
}

function resolvePath(path: string, pathParams?: Record<string, string>): string {
  if (!pathParams) return path;
  let resolved = path;
  for (const [key, value] of Object.entries(pathParams)) {
    resolved = resolved.replace(`:${key}`, value);
  }
  return resolved;
}

export async function executeCallEndpoint(
  input: CallEndpointInput,
  context: ToolContext
) {
  const { endpointId, pathParams, body, query } = input;
  const { workspaceId, userId } = context;

  if (!workspaceId || !userId) {
    throw new Error("Workspace ID and user ID are required in context");
  }

  if (!endpointId) {
    throw new Error("endpointId is required");
  }

  // Look up the endpoint to get method, path, inputSchema, and serviceId
  const endpoint = await getEndpointByIdForWorkspace(endpointId, workspaceId);
  if (!endpoint) {
    throw new Error(`Endpoint not found: ${endpointId}`);
  }

  // Look up the service to get the port
  const service = await getServiceById(endpoint.serviceId, workspaceId);
  if (!service) {
    throw new Error(`Service not found for endpoint: ${endpointId}`);
  }

  if (!service.port) {
    throw new Error(`Service is not running (no port assigned): ${service.title}`);
  }

  const { method, path } = endpoint;
  const parsedQuery = parseJsonField(query);
  const parsedBody = parseJsonField(body);

  // Resolve path params in the URL
  const resolvedPath = resolvePath(path, pathParams);

  // Build the URL
  const url = new URL(resolvedPath, `${SERVICE_HOST}:${service.port}`);
  if (parsedQuery && Object.keys(parsedQuery).length > 0) {
    url.search = new URLSearchParams(parsedQuery as Record<string, string>).toString();
  }

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (!["GET", "HEAD"].includes(method) && parsedBody != null) {
    fetchOptions.body = typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), fetchOptions);
  } catch (err: any) {
    throw new Error(`Service unreachable: ${err.message}`);
  }

  const text = await response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new Error(`Service returned ${response.status}: ${typeof parsed === "object" ? JSON.stringify(parsed) : text}`);
  }

  return parsed;
}
