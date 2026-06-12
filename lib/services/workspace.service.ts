import { asc, eq, and } from "drizzle-orm";
import { db } from "../db";
import { workspaces, type NewWorkspace, type Workspace } from "../db/schema";

export async function createWorkspace(
  data: Pick<NewWorkspace, "name" | "userId"> & {
    description?: string;
    agentName?: string;
    userNickname?: string;
    orgId?: string | null;
  },
): Promise<Workspace> {
  const result = await db
    .insert(workspaces)
    .values({
      name: data.name.trim(),
      description: data.description?.trim() ?? "",
      orgId: data.orgId ?? null,
      userId: data.userId,
      agentName: data.agentName?.trim() ?? "Assistant",
      userNickname: data.userNickname?.trim() ?? "User",
    })
    .returning();

  return result[0];
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  return db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .orderBy(asc(workspaces.createdAt));
}

export async function getWorkspaceOwnedByUser(
  workspaceId: string,
  userId: string,
): Promise<Workspace | null> {
  const result = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getDefaultWorkspace(
  userId: string,
): Promise<Workspace | null> {
  const result = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function getWorkspaceOwnerId(
  workspaceId: string,
): Promise<string | null> {
  const result = await db
    .select({ userId: workspaces.userId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return result[0]?.userId ?? null;
}

export async function assignWorkspaceToOrg(
  workspaceId: string,
  orgId: string,
): Promise<void> {
  await db
    .update(workspaces)
    .set({ orgId })
    .where(eq(workspaces.id, workspaceId));
}

export async function unassignWorkspaceFromOrg(
  workspaceId: string,
): Promise<void> {
  await db
    .update(workspaces)
    .set({ orgId: null })
    .where(eq(workspaces.id, workspaceId));
}

export async function deactivateWorkspace(
  workspaceId: string,
): Promise<{ archivedServices: number; pausedTasks: number }> {
  const now = new Date();

  // Stop all running services first so processes aren't orphaned
  const { enqueueServiceStop } = await import("@/lib/queues/pg-boss");

  // Query running services to enqueue stops
  const { services } = await import("../db/schema");
  const runningServices = await db
    .select({ id: services.id })
    .from(services)
    .where(
      and(
        eq(services.workspaceId, workspaceId),
        eq(services.status, "running"),
      ),
    );
  await Promise.all(
    runningServices.map((svc) =>
      enqueueServiceStop({ serviceId: svc.id, workspaceId }),
    ),
  );

  // Archive all services in the workspace
  const archived = await db
    .update(services)
    .set({ status: "archived", updatedAt: now })
    .where(eq(services.workspaceId, workspaceId))
    .returning({ id: services.id });

  // Pause all active tasks
  const { pauseWorkspaceTasks } = await import("./task.service");
  const paused = await pauseWorkspaceTasks(workspaceId);

  // Mark workspace as deactivated
  await db
    .update(workspaces)
    .set({ deactivatedAt: now, updatedAt: now })
    .where(eq(workspaces.id, workspaceId));

  return {
    archivedServices: archived.length,
    pausedTasks: paused,
  };
}

export async function reactivateWorkspace(
  workspaceId: string,
): Promise<{ unarchivedServices: number; resumedTasks: number }> {
  const now = new Date();

  const { services } = await import("../db/schema");

  // Unarchive all services (set back to stopped) and enqueue spawn for each
  const unarchived = await db
    .update(services)
    .set({ status: "stopped", updatedAt: now })
    .where(eq(services.workspaceId, workspaceId))
    .returning({ id: services.id });

  const { enqueueServiceSpawn } = await import("@/lib/queues/pg-boss");
  await Promise.all(
    unarchived.map((svc) =>
      enqueueServiceSpawn({ serviceId: svc.id, workspaceId }),
    ),
  );

  // Resume all paused tasks
  const { resumeWorkspaceTasks } = await import("./task.service");
  const resumed = await resumeWorkspaceTasks(workspaceId);

  // Clear deactivatedAt
  await db
    .update(workspaces)
    .set({ deactivatedAt: null, updatedAt: now })
    .where(eq(workspaces.id, workspaceId));

  return {
    unarchivedServices: unarchived.length,
    resumedTasks: resumed,
  };
}
