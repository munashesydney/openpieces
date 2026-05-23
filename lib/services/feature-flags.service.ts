import { db } from "@/lib/db";
import {
  featureFlags,
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlag,
  type FeatureFlagKey,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Returns all feature flags with their current state.
 * Missing flags (not yet seeded) are returned as disabled.
 */
export async function getAllFeatureFlags(): Promise<
  Record<FeatureFlagKey, boolean>
> {
  const rows = await db.select().from(featureFlags);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.enabled]));

  const result = {} as Record<FeatureFlagKey, boolean>;
  for (const def of FEATURE_FLAG_DEFINITIONS) {
    result[def.key as FeatureFlagKey] = map[def.key] ?? false;
  }
  return result;
}

/**
 * Returns a single feature flag's enabled state.
 */
export async function getFeatureFlag(
  key: FeatureFlagKey,
): Promise<boolean> {
  const result = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1);
  return result[0]?.enabled ?? false;
}

/**
 * Returns true if the given feature flag is enabled.
 * Convenience alias for getFeatureFlag.
 */
export async function isFeatureEnabled(
  key: FeatureFlagKey,
): Promise<boolean> {
  return getFeatureFlag(key);
}

/**
 * Seeds all defined feature flags that don't yet exist in the DB.
 * Safe to call on every startup — no-ops for existing flags.
 */
export async function seedFeatureFlags(): Promise<void> {
  const existing = await db.select({ key: featureFlags.key }).from(featureFlags);
  const existingKeys = new Set(existing.map((r) => r.key));

  for (const def of FEATURE_FLAG_DEFINITIONS) {
    if (!existingKeys.has(def.key)) {
      await db.insert(featureFlags).values({
        key: def.key,
        enabled: false,
      });
      console.log(`[feature-flags] Seeded: ${def.key} (disabled)`);
    }
  }
}
