import { and, desc, eq, count, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { opencodeSessions, services } from "@/lib/db/schema";

export type SessionWithService = {
  sessionId: string;
  serviceId: string;
  serviceTitle: string;
  directory: string | null;
  status: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
};

export async function listSessionsForWorkspace(
  workspaceId: string,
  page: number = 1,
  pageSize: number = 20,
  serviceId?: string
): Promise<{ data: SessionWithService[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const baseWhere = eq(services.workspaceId, workspaceId);
  const whereClause = serviceId
    ? and(baseWhere, eq(opencodeSessions.serviceId, serviceId))
    : baseWhere;

  const rows = await db
    .select({
      sessionId: opencodeSessions.sessionId,
      serviceId: services.id,
      serviceTitle: services.title,
      directory: services.directory,
      status: opencodeSessions.status,
      lastMessage: opencodeSessions.lastMessage,
      lastMessageAt: opencodeSessions.lastMessageAt,
      createdAt: opencodeSessions.createdAt,
    })
    .from(opencodeSessions)
    .innerJoin(services, eq(opencodeSessions.serviceId, services.id))
    .where(whereClause)
    .orderBy(desc(opencodeSessions.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(opencodeSessions)
    .innerJoin(services, eq(opencodeSessions.serviceId, services.id))
    .where(whereClause);

  return {
    data: rows.map((r) => ({
      sessionId: r.sessionId,
      serviceId: r.serviceId,
      serviceTitle: r.serviceTitle,
      directory: r.directory,
      status: r.status,
      lastMessage: r.lastMessage,
      lastMessageAt: r.lastMessageAt,
      createdAt: r.createdAt,
    })),
    total: totalResult?.count ?? rows.length,
  };
}

export async function getSessionInfo(sessionId: string, workspaceId: string): Promise<SessionWithService | null> {
  const rows = await db
    .select({
      sessionId: opencodeSessions.sessionId,
      serviceId: services.id,
      serviceTitle: services.title,
      directory: services.directory,
      status: opencodeSessions.status,
      lastMessage: opencodeSessions.lastMessage,
      lastMessageAt: opencodeSessions.lastMessageAt,
      createdAt: opencodeSessions.createdAt,
    })
    .from(opencodeSessions)
    .innerJoin(services, eq(opencodeSessions.serviceId, services.id))
    .where(
      and(
        eq(opencodeSessions.sessionId, sessionId),
        eq(services.workspaceId, workspaceId)
      )
    )
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  return {
    sessionId: r.sessionId,
    serviceId: r.serviceId,
    serviceTitle: r.serviceTitle,
    directory: r.directory,
    status: r.status,
    lastMessage: r.lastMessage,
    lastMessageAt: r.lastMessageAt,
    createdAt: r.createdAt,
  };
}

export async function getSessionInfoById(sessionId: string): Promise<{ sessionId: string; serviceId: string; workspaceId: string } | null> {
  const rows = await db
    .select({
      sessionId: opencodeSessions.sessionId,
      serviceId: opencodeSessions.serviceId,
      workspaceId: services.workspaceId,
    })
    .from(opencodeSessions)
    .innerJoin(services, eq(opencodeSessions.serviceId, services.id))
    .where(eq(opencodeSessions.sessionId, sessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getServiceId(sessionId: string): Promise<string | null> {
  const rows = await db
    .select({ serviceId: opencodeSessions.serviceId })
    .from(opencodeSessions)
    .where(eq(opencodeSessions.sessionId, sessionId))
    .limit(1);
  return rows[0]?.serviceId ?? null;
}

export async function getDirectory(sessionId: string): Promise<string | null> {
  const rows = await db
    .select({ directory: services.directory })
    .from(opencodeSessions)
    .innerJoin(services, eq(opencodeSessions.serviceId, services.id))
    .where(eq(opencodeSessions.sessionId, sessionId))
    .limit(1);
  const dir = rows[0]?.directory;
  return dir && typeof dir === "string" && dir.trim() !== "" ? dir : null;
}

export async function setService(
  sessionId: string,
  serviceId: string
): Promise<void> {
  await db
    .insert(opencodeSessions)
    .values({
      sessionId,
      serviceId,
      status: "active",
    })
    .onConflictDoUpdate({
      target: opencodeSessions.sessionId,
      set: {
        serviceId,
        status: "active",
        updatedAt: new Date(),
      },
    });
}

export async function serviceHasWorkingSession(
  serviceId: string,
  excludeSessionId?: string
): Promise<boolean> {
  const rows = await db
    .select({ sessionId: opencodeSessions.sessionId })
    .from(opencodeSessions)
    .where(
      and(
        eq(opencodeSessions.serviceId, serviceId),
        eq(opencodeSessions.status, "working"),
        excludeSessionId ? ne(opencodeSessions.sessionId, excludeSessionId) : undefined
      )
    )
    .limit(1);
  return rows.length > 0;
}
