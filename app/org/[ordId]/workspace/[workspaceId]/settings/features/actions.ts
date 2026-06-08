"use server";

import { db } from "@/lib/db";
import { featureFlags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { revalidatePath } from "next/cache";

export async function toggleFeatureFlagAction(key: string, enabled: boolean) {
  // Feature flags are global, not per-workspace. Auth via any workspace ownership.
  // We use a simple server-side guard; the page is already behind auth.
  const existing = await db
    .select({ key: featureFlags.key })
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(featureFlags)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(featureFlags.key, key));
  } else {
    await db.insert(featureFlags).values({ key, enabled });
  }

  revalidatePath("/workspace/[workspaceId]/settings/features");
}
