import {
  getEvents,
  getEventById,
  getEventByName,
  createEvent,
  updateEvent,
  deleteEvent,
  getSubscriptionsForWorkflow,
  getEventsForWorkflow,
  getWorkflowsForEvent,
} from "@/lib/services/event.service";
import type { ToolContext } from "@/lib/tools/registry";
import type { EventsToolInput } from "./definition";

export async function executeEventsTool(
  input: EventsToolInput,
  context: ToolContext,
) {
  const {
    action,
    eventId,
    eventName,
    workflowId,
    page,
    limit,
    createDetails,
    updateDetails,
  } = input;
  const { workspaceId } = context;

  if (!workspaceId) {
    throw new Error("Workspace ID is required in context");
  }

  switch (action) {
    case "list": {
      return await getEvents(workspaceId, page ?? 1, limit ?? 10);
    }

    case "get": {
      if (eventId) {
        const event = await getEventById(eventId, workspaceId);
        if (!event) {
          throw new Error(`Event not found: ${eventId}`);
        }
        return event;
      }
      if (eventName) {
        const event = await getEventByName(workspaceId, eventName);
        if (!event) {
          throw new Error(`Event not found: ${eventName}`);
        }
        return event;
      }
      throw new Error("eventId or eventName is required for action 'get'");
    }

    case "create": {
      if (!createDetails) {
        throw new Error("createDetails is required for action 'create'");
      }
      if (!createDetails.eventName?.trim()) {
        throw new Error(
          "createDetails.eventName is required for action 'create'",
        );
      }
      return await createEvent({
        workspaceId,
        eventName: createDetails.eventName,
        description: createDetails.description ?? "",
      });
    }

    case "update": {
      if (!eventId) {
        throw new Error("eventId is required for action 'update'");
      }
      if (!updateDetails || Object.keys(updateDetails).length === 0) {
        throw new Error(
          "updateDetails with at least one field is required for action 'update'",
        );
      }
      const updated = await updateEvent(eventId, workspaceId, {
        ...(updateDetails.eventName !== undefined && {
          eventName: updateDetails.eventName,
        }),
        ...(updateDetails.description !== undefined && {
          description: updateDetails.description,
        }),
      });
      if (!updated) {
        throw new Error(`Event not found or update failed: ${eventId}`);
      }
      return updated;
    }

    case "delete": {
      if (!eventId) {
        throw new Error("eventId is required for action 'delete'");
      }
      const deleted = await deleteEvent(eventId, workspaceId);
      if (!deleted) {
        throw new Error(`Event not found or delete failed: ${eventId}`);
      }
      return { success: true, deleted: eventId };
    }

    case "list_subscriptions": {
      if (workflowId) {
        const subs = await getSubscriptionsForWorkflow(workflowId, workspaceId);
        const eventIds = subs.map((s) => s.eventId);
        if (eventIds.length === 0) return { subscriptions: [], events: [] };

        const evts = await getEventsForWorkflow(workflowId, workspaceId);
        return { subscriptions: subs, events: evts };
      }

      if (eventId) {
        const workflows = await getWorkflowsForEvent(eventId);
        return { workflows };
      }

      // Return all subscriptions in the workspace
      // (fetch them via the events, paginated)
      const events = await getEvents(workspaceId, 1, 100);
      return { events: events.data };
    }

    default: {
      throw new Error(
        `Unknown action: ${action}. Valid actions are: list, get, create, update, delete, list_subscriptions.`,
      );
    }
  }
}
