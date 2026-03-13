import { asc, eq } from "drizzle-orm";
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
