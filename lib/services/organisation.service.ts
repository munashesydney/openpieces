import { asc, eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  organizations,
  workspaces,
  type NewOrganization,
  type Organization,
} from "../db/schema";

export async function createOrganisation(
  data: Pick<NewOrganization, "name" | "userId"> & {
    description?: string;
  },
): Promise<Organization> {
  const result = await db
    .insert(organizations)
    .values({
      name: data.name.trim(),
      description: data.description?.trim() ?? "",
      userId: data.userId,
    })
    .returning();

  return result[0];
}

export async function getUserOrganisations(
  userId: string,
): Promise<Organization[]> {
  return db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, userId))
    .orderBy(asc(organizations.createdAt));
}

export async function getOrganisationById(
  orgId: string,
): Promise<Organization | null> {
  const result = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return result[0] ?? null;
}

export async function getOrganisationWithWorkspaces(orgId: string) {
  const org = await getOrganisationById(orgId);
  if (!org) return null;

  const orgWorkspaces = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.orgId, orgId))
    .orderBy(asc(workspaces.createdAt));

  return { ...org, workspaces: orgWorkspaces };
}

export async function getStandaloneWorkspaces(userId: string) {
  return db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.userId, userId), isNull(workspaces.orgId)))
    .orderBy(asc(workspaces.createdAt));
}

export async function getWorkspacesByOrgIds(
  orgIds: string[],
): Promise<Map<string, (typeof workspaces.$inferSelect)[]>> {
  const rows = await db
    .select()
    .from(workspaces)
    .where(inArray(workspaces.orgId, orgIds))
    .orderBy(asc(workspaces.createdAt));

  const map = new Map<string, (typeof workspaces.$inferSelect)[]>();
  for (const row of rows) {
    const key = row.orgId!;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}
