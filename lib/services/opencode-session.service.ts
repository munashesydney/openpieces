import { and, desc, eq, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { opencodeSessions, services } from "@/lib/db/schema";
import { getAuthHeaders, getBaseUrl } from "@/lib/services/opencode.service";

// ── OpenCode session status types ──────────────────────────────────────────

type SessionStatusIdle = { type: "idle" };
type SessionStatusBusy = { type: "busy" };
type SessionStatusRetry = {
  type: "retry";
  attempt: number;
  message: string;
  next: number;
};
type SessionStatusResponse =
  | SessionStatusIdle
  | SessionStatusBusy
  | SessionStatusRetry;

type SessionStatusMap = Record<string, SessionStatusResponse>;

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
  serviceId?: string,
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

export async function getSessionInfo(
  sessionId: string,
  workspaceId: string,
): Promise<SessionWithService | null> {
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
        eq(services.workspaceId, workspaceId),
      ),
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

export async function getSessionInfoById(sessionId: string): Promise<{
  sessionId: string;
  serviceId: string;
  workspaceId: string;
} | null> {
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
  serviceId: string,
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

// ── OpenCode API helpers ───────────────────────────────────────────────────

/**
 * Fetch session statuses from the opencode server.
 * Returns a map of sessionId → status, or null if the API call fails.
 */
async function fetchOpenCodeSessionStatuses(
  directory?: string,
): Promise<SessionStatusMap | null> {
  try {
    const url = new URL(`${getBaseUrl()}/session/status`);
    if (directory) url.searchParams.set("directory", directory);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      console.error(
        `[opencode-session] GET /session/status returned ${response.status}`,
      );
      return null;
    }

    return (await response.json()) as SessionStatusMap;
  } catch (error) {
    console.error(
      "[opencode-session] Failed to fetch session statuses:",
      error,
    );
    return null;
  }
}

/**
 * Abort a session on the opencode server that is stuck in a retry loop.
 * Returns true if the abort was acknowledged, false otherwise.
 */
export async function abortOpenCodeSession(
  sessionId: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${getBaseUrl()}/session/${encodeURIComponent(sessionId)}/abort`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!response.ok) {
      console.error(
        `[opencode-session] POST /session/${sessionId}/abort returned ${response.status}`,
      );
      return false;
    }

    return (await response.json()) === true;
  } catch (error) {
    console.error(
      `[opencode-session] Failed to abort session ${sessionId}:`,
      error,
    );
    return false;
  }
}

/**
 * Update the status of a session in the database.
 */
export async function updateDbSessionStatus(
  sessionId: string,
  status: string,
): Promise<void> {
  await db
    .update(opencodeSessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(opencodeSessions.sessionId, sessionId));
}

export async function serviceHasWorkingSession(
  serviceId: string,
): Promise<boolean> {
  // Step 1: Get ALL sessions for this service (don't trust any DB status)
  const rows = await db
    .select({ sessionId: opencodeSessions.sessionId })
    .from(opencodeSessions)
    .where(eq(opencodeSessions.serviceId, serviceId));

  if (rows.length === 0) return false;

  // Step 2: Verify actual status from opencode server
  const statusMap = await fetchOpenCodeSessionStatuses();

  // If opencode is unreachable, fall back to DB "working" status (conservative)
  if (statusMap === null) {
    const dbWorkingRows = await db
      .select({ sessionId: opencodeSessions.sessionId })
      .from(opencodeSessions)
      .where(
        and(
          eq(opencodeSessions.serviceId, serviceId),
          eq(opencodeSessions.status, "working"),
        ),
      )
      .limit(1);

    if (dbWorkingRows.length > 0) {
      console.warn(
        `[opencode-session] Cannot verify sessions for service ${serviceId} — opencode unreachable, falling back to DB state`,
      );
      return true;
    }
    return false;
  }

  // Step 3: Reconcile each session against opencode's actual status
  let hasBusySession = false;

  for (const row of rows) {
    const { sessionId } = row;
    const actualStatus = statusMap[sessionId];

    if (!actualStatus) {
      // Session doesn't exist in opencode — DB is stale
      await updateDbSessionStatus(sessionId, "completed");
      continue;
    }

    switch (actualStatus.type) {
      case "busy":
        hasBusySession = true;
        break;

      case "idle":
        // Session exists but is idle — DB status may be out of sync
        await updateDbSessionStatus(sessionId, "completed");
        break;

      case "retry":
        // Session is stuck in a retry loop — abort it so it can be reused
        console.log(
          `[opencode-session] Session ${sessionId} is retrying (attempt ${actualStatus.attempt}): "${actualStatus.message}" — aborting`,
        );
        const aborted = await abortOpenCodeSession(sessionId);
        await updateDbSessionStatus(
          sessionId,
          aborted ? "failed" : "completed",
        );
        break;
    }
  }

  return hasBusySession;
}
