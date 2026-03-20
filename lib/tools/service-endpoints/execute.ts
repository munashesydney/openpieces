import type { ToolContext } from "@/lib/tools/registry";
import type { EndpointsToolInput } from "./definition";
import {
  getEndpointsByServiceId,
  getEndpointById,
} from "@/lib/services/service-endpoint.service";
import { isValidUuid } from "@/lib/utils/uuid";

export async function executeEndpoints(
  input: EndpointsToolInput,
  context: ToolContext
) {
  const { action, serviceId, endpointId } = input;
  const { workspaceId, userId } = context;

  if (!workspaceId || !userId) {
    throw new Error("Workspace ID and user ID are required in context");
  }

  switch (action) {
    case "list": {
      if (!serviceId) {
        throw new Error("serviceId is required for action 'list'");
      }
      if (!isValidUuid(serviceId)) {
        throw new Error("Invalid serviceId format");
      }
      return await getEndpointsByServiceId(serviceId, workspaceId);
    }

    case "get": {
      if (!endpointId) {
        throw new Error("endpointId is required for action 'get'");
      }
      if (!serviceId) {
        throw new Error("serviceId is required for action 'get'");
      }
      if (!isValidUuid(endpointId) || !isValidUuid(serviceId)) {
        throw new Error("Invalid endpointId or serviceId format");
      }
      const endpoint = await getEndpointById(endpointId, serviceId, workspaceId);
      if (!endpoint) {
        throw new Error(`Endpoint not found: ${endpointId}`);
      }
      return endpoint;
    }

    default: {
      throw new Error("Unknown action. Valid actions are: list, get.");
    }
  }
}
