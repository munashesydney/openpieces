import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users, type NewUser, type User } from "../db/schema";

export async function countUsers(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  return Number(result[0].count);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return result[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createUser(
  data: Pick<NewUser, "name" | "email"> & { password: string }
): Promise<User> {
  const passwordHash = await bcrypt.hash(data.password, 12);

  const result = await db
    .insert(users)
    .values({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: passwordHash,
    })
    .returning();

  return result[0];
}

export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
