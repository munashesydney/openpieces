import { eq, and, count, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  events,
  eventSubscriptions,
  type Event,
  type NewEvent,
  type EventSubscription,
} from "../db/schema";
import { isValidUuid } from "../utils/uuid";

// ── Events CRUD ─────────────────────────────────────────────────────────────

export async function getEvents(
  workspaceId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ data: Event[]; total: number }> {
  if (!isValidUuid(workspaceId)) return { data: [], total: 0 };

  const offset = (page - 1) * pageSize;

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(events)
      .where(eq(events.workspaceId, workspaceId))
      .limit(pageSize)
      .offset(offset)
      .orderBy(events.createdAt),
    db
      .select({ count: count() })
      .from(events)
      .where(eq(events.workspaceId, workspaceId)),
  ]);

  return {
    data,
    total: totalResult[0].count,
  };
}

export async function getEventById(
  eventId: string,
  workspaceId: string,
): Promise<Event | null> {
  if (!isValidUuid(eventId) || !isValidUuid(workspaceId)) return null;

  const result = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.workspaceId, workspaceId)))
    .limit(1);

  return result[0] ?? null;
}

export async function getEventByName(
  workspaceId: string,
  eventName: string,
): Promise<Event | null> {
  if (!isValidUuid(workspaceId)) return null;

  const result = await db
    .select()
    .from(events)
    .where(
      and(eq(events.workspaceId, workspaceId), eq(events.eventName, eventName)),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function createOrGetEvent(
  workspaceId: string,
  eventName: string,
): Promise<Event> {
  if (!eventName.startsWith("op.")) {
    throw new Error("Event name must start with 'op.'");
  }

  const existing = await getEventByName(workspaceId, eventName);
  if (existing) return existing;

  const result = await db
    .insert(events)
    .values({ workspaceId, eventName })
    .returning();
  return result[0];
}

export async function createEvent(data: NewEvent): Promise<Event> {
  if (!data.eventName.startsWith("op.")) {
    throw new Error("Event name must start with 'op.'");
  }

  const result = await db.insert(events).values(data).returning();
  return result[0];
}

export async function updateEvent(
  eventId: string,
  workspaceId: string,
  data: Partial<NewEvent>,
): Promise<Event> {
  if (data.eventName !== undefined && !data.eventName.startsWith("op.")) {
    throw new Error("Event name must start with 'op.'");
  }

  const result = await db
    .update(events)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(events.id, eventId), eq(events.workspaceId, workspaceId)))
    .returning();
  return result[0];
}

export async function deleteEvent(
  eventId: string,
  workspaceId: string,
): Promise<boolean> {
  if (!isValidUuid(eventId) || !isValidUuid(workspaceId)) return false;

  // Subscriptions cascade on delete
  const result = await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.workspaceId, workspaceId)))
    .returning({ id: events.id });

  return result.length > 0;
}

// ── Event Subscriptions ─────────────────────────────────────────────────────

export async function subscribeWorkflowToEvent(
  workflowId: string,
  eventId: string,
  workspaceId: string,
): Promise<EventSubscription> {
  const result = await db
    .insert(eventSubscriptions)
    .values({ workflowId, eventId, workspaceId })
    .returning();
  return result[0];
}

export async function unsubscribeWorkflowFromEvent(
  workflowId: string,
  eventId: string,
): Promise<boolean> {
  const result = await db
    .delete(eventSubscriptions)
    .where(
      and(
        eq(eventSubscriptions.workflowId, workflowId),
        eq(eventSubscriptions.eventId, eventId),
      ),
    )
    .returning({ id: eventSubscriptions.id });

  return result.length > 0;
}

export async function getSubscriptionsForWorkflow(
  workflowId: string,
  workspaceId: string,
): Promise<EventSubscription[]> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) return [];

  return db
    .select()
    .from(eventSubscriptions)
    .where(
      and(
        eq(eventSubscriptions.workflowId, workflowId),
        eq(eventSubscriptions.workspaceId, workspaceId),
      ),
    );
}

export async function getWorkflowsForEvent(
  eventId: string,
): Promise<{ workflowId: string; workspaceId: string }[]> {
  if (!isValidUuid(eventId)) return [];

  const result = await db
    .select({
      workflowId: eventSubscriptions.workflowId,
      workspaceId: eventSubscriptions.workspaceId,
    })
    .from(eventSubscriptions)
    .where(eq(eventSubscriptions.eventId, eventId));

  return result;
}

export async function getEventsForWorkflow(
  workflowId: string,
  workspaceId: string,
): Promise<Event[]> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) return [];

  const subs = await db
    .select({ eventId: eventSubscriptions.eventId })
    .from(eventSubscriptions)
    .where(
      and(
        eq(eventSubscriptions.workflowId, workflowId),
        eq(eventSubscriptions.workspaceId, workspaceId),
      ),
    );

  if (subs.length === 0) return [];

  const eventIds = subs.map((s) => s.eventId);
  return db.select().from(events).where(inArray(events.id, eventIds));
}

export async function getSubscriptionCountsByEvent(
  workspaceId: string,
): Promise<Record<string, number>> {
  if (!isValidUuid(workspaceId)) return {};

  const rows = await db
    .select({
      eventId: eventSubscriptions.eventId,
      count: count(),
    })
    .from(eventSubscriptions)
    .where(eq(eventSubscriptions.workspaceId, workspaceId))
    .groupBy(eventSubscriptions.eventId);

  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.eventId] = row.count;
  }
  return map;
}
