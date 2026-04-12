import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Cap the pool size to prevent connection exhaustion.
// Each Next.js instance gets its own pool of this size.
const DB_POOL_MAX = parseInt(process.env.DB_POOL_MAX ?? "5", 10);
if (isNaN(DB_POOL_MAX) || DB_POOL_MAX < 1) {
  throw new Error(`Invalid DB_POOL_MAX value: ${process.env.DB_POOL_MAX}. Must be a positive integer.`);
}

const client = postgres(process.env.DATABASE_URL, {
  max: DB_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { 
  schema,
  logger: process.env.DB_LOGGING === "true"
});
