import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { opencodeSessions } from "@/lib/db/schema";

export async function getDirectory(sessionId: string): Promise<string | null> {
  const rows = await db
    .select({ directory: opencodeSessions.directory })
    .from(opencodeSessions)
    .where(eq(opencodeSessions.sessionId, sessionId))
    .limit(1);
  return rows[0]?.directory ?? null;
}

export async function setDirectory(
  sessionId: string,
  directory: string
): Promise<void> {
  await db
    .insert(opencodeSessions)
    .values({
      sessionId,
      directory,
    })
    .onConflictDoUpdate({
      target: opencodeSessions.sessionId,
      set: {
        directory,
        updatedAt: new Date(),
      },
    });
}
