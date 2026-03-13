import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("Running database migrations...");

  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });

  await client.end();

  console.log("Migrations complete.");
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
