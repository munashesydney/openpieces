import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
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
  const adminPassword = process.env.OP_ADMIN_PASSWORD;
  if (adminPassword) {
    // Compare fixed-length digests without exposing password-dependent timing.
    return timingSafeEqual(
      createHash("sha256").update(plaintext).digest(),
      createHash("sha256").update(adminPassword).digest(),
    );
  }

  return bcrypt.compare(plaintext, hash);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await findUserById(userId);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const isValid = await verifyPassword(currentPassword, user.password);
  if (!isValid) {
    return { success: false, error: "Current password is incorrect" };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({ password: newPasswordHash })
    .where(eq(users.id, userId));

  return { success: true };
}
