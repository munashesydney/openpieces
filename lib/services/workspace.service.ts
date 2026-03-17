import { asc, eq, and } from "drizzle-orm";
import { db } from "../db";
import { workspaces, type NewWorkspace, type Workspace } from "../db/schema";

export async function createWorkspace(
  data: Pick<NewWorkspace, "name" | "userId">
): Promise<Workspace> {
  const result = await db
    .insert(workspaces)
    .values({
      name: data.name.trim(),
      userId: data.userId,
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
  userId: string
): Promise<Workspace | null> {
  const result = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getDefaultWorkspace(
  userId: string
): Promise<Workspace | null> {
  const result = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function getWorkspaceOwnerId(
  workspaceId: string
): Promise<string | null> {
  const result = await db
    .select({ userId: workspaces.userId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return result[0]?.userId ?? null;
}
