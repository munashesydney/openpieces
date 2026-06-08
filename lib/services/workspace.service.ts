import { asc, eq, and, isNull } from "drizzle-orm";
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
