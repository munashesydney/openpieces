import { createSession, getMessages } from "@/lib/services/opencode.service";
import {
  listSessionsForWorkspace,
  getSessionInfo,
  setService,
  abortOpenCodeSession,
  updateDbSessionStatus,
} from "@/lib/services/opencode-session.service";
import { getServiceById } from "@/lib/services/service.service";
import type { ToolContext } from "@/lib/tools/registry";
import type { SessionsToolInput } from "./definition";

export async function executeSessions(
  input: SessionsToolInput,
  context: ToolContext,
) {
  const { action, sessionId, serviceId, page, limit } = input;
  const { workspaceId } = context;

  if (!workspaceId) {
    throw new Error("Workspace ID is required in context");
  }

  switch (action) {
    case "list": {
      return await listSessionsForWorkspace(
        workspaceId,
        page ?? 1,
        limit ?? 20,
        serviceId,
      );
    }

    case "get": {
      if (!sessionId) {
        throw new Error("sessionId is required for action 'get'");
      }
      const session = await getSessionInfo(sessionId, workspaceId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      // Optionally fetch messages from OpenCode
      try {
        const messages = await getMessages(sessionId);
        return { ...session, messageCount: messages?.length ?? 0 };
      } catch {
        return session;
      }
    }

    case "create": {
      if (!serviceId) {
        throw new Error("serviceId is required for action 'create'");
      }
      const service = await getServiceById(serviceId, workspaceId);
      if (!service) {
        throw new Error(`Service not found: ${serviceId}`);
      }
      const directory = service.directory?.trim();
      if (!directory) {
        throw new Error(
          "Selected service has no directory set. Use manage_services to create or update a service with a directory first.",
        );
      }
      const session = await createSession();
      const id = session.session_id ?? (session as { id?: string }).id;
      if (!id) {
        throw new Error("OpenCode did not return a session id");
      }
      await setService(id, serviceId);
      return {
        ...session,
        sessionId: id,
        serviceTitle: service.title,
        directory,
      };
    }

    case "abort": {
      if (!sessionId) {
        throw new Error("sessionId is required for action 'abort'");
      }

      const session = await getSessionInfo(sessionId, workspaceId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const aborted = await abortOpenCodeSession(sessionId);
      if (!aborted) {
        throw new Error(`Failed to abort session ${sessionId}`);
      }

      await updateDbSessionStatus(sessionId, "error");

      return {
        sessionId,
        status: "error",
        message: `Session ${sessionId} has been aborted.`,
      };
    }

    default: {
      throw new Error(
        `Unknown action: ${action}. Valid actions are: list, get, create, abort.`,
      );
    }
  }
}
