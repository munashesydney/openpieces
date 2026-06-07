import { db } from "@/lib/db";
import { featureFlags, FEATURE_FLAG_DEFINITIONS } from "@/lib/db/schema";
import { FeatureFlagsClient } from "./client";

export default async function FeatureFlagsPage() {
  const rows = await db.select().from(featureFlags);
  const flags = FEATURE_FLAG_DEFINITIONS.map((def) => ({
    ...def,
    enabled: rows.find((r) => r.key === def.key)?.enabled ?? false,
  }));

  return <FeatureFlagsClient flags={flags} />;
}
