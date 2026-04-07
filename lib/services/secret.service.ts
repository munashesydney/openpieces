import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { secrets, type NewSecretRow, type SecretRow } from "../db/schema";
import { isValidUuid } from "../utils/uuid";
import { encryptSecret, decryptSecret } from "../security/encryption";
import { ValidationError } from "../errors/validation-error";

export type Secret = {
  id: string;
  workspaceId: string;
  userId: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getSecrets(
  workspaceId: string,
  userId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: Secret[]; total: number }> {
  if (!isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return { data: [], total: 0 };
  }

  const offset = (page - 1) * pageSize;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(secrets)
      .where(and(eq(secrets.workspaceId, workspaceId), eq(secrets.userId, userId)))
      .orderBy(desc(secrets.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(secrets)
      .where(and(eq(secrets.workspaceId, workspaceId), eq(secrets.userId, userId))),
  ]);

  return {
    data: rows.map(mapRowToSecret),
    total: totalResult[0]?.count ?? 0,
  };
}

export async function getSecretById(
  id: string,
  workspaceId: string,
  userId: string
): Promise<Secret | null> {
  if (!isValidUuid(id) || !isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return null;
  }

  const rows = await db
    .select()
    .from(secrets)
    .where(
      and(
        eq(secrets.id, id),
        eq(secrets.workspaceId, workspaceId),
        eq(secrets.userId, userId)
      )
    )
    .limit(1);

  const row = rows[0];
  return row ? mapRowToSecret(row) : null;
}

export async function createSecret(input: {
  workspaceId: string;
  userId: string;
  key: string;
  value: string;
  /** When true, empty value is stored (e.g. internal API placeholder secrets). */
  allowEmptyValue?: boolean;
}): Promise<Secret> {
  const key = input.key.trim();
  if (!key) {
    throw new ValidationError("Key is required.");
  }
  if (key.length > 128) {
    throw new ValidationError("Key is too long (max 128 characters).");
  }
  const value = input.value ?? "";
  if (!input.allowEmptyValue && (input.value == null || input.value === "")) {
    throw new ValidationError("Value is required.");
  }

  const encrypted = encryptSecret(value);

  const now = new Date();
  const toInsert: NewSecretRow = {
    workspaceId: input.workspaceId,
    userId: input.userId,
    key,
    valueEncrypted: encrypted,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const [row] = await db.insert(secrets).values(toInsert).returning();
    const secret = mapRowToSecret(row);

    // Auto-respawn services that use this secret
    if (value) {
      const { respawnServicesUsingSecret } = await import("./service-required-secrets.service");
      respawnServicesUsingSecret(input.workspaceId, secret.key).catch(console.error);
    }

    return secret;
  } catch (err: any) {
    if (err?.code === "23505") {
      // unique violation
      throw new ValidationError("A secret with that key already exists.");
    }
    throw err;
  }
}

export async function updateSecret(input: {
  id: string;
  workspaceId: string;
  userId: string;
  key: string;
  value: string;
}): Promise<Secret> {
  if (!isValidUuid(input.id)) {
    throw new ValidationError("Invalid secret id.");
  }

  const key = input.key.trim();
  if (!key) {
    throw new ValidationError("Key is required.");
  }
  if (key.length > 128) {
    throw new ValidationError("Key is too long (max 128 characters).");
  }
  if (input.value == null || input.value === "") {
    throw new ValidationError("Value is required.");
  }

  const encrypted = encryptSecret(input.value);

  try {
    const [row] = await db
      .update(secrets)
      .set({
        key,
        valueEncrypted: encrypted,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(secrets.id, input.id),
          eq(secrets.workspaceId, input.workspaceId),
          eq(secrets.userId, input.userId)
        )
      )
      .returning();

    if (!row) {
      throw new ValidationError("Secret not found.");
    }

    const secret = mapRowToSecret(row);

    // Auto-respawn services that use this secret
    if (input.value) {
      const { respawnServicesUsingSecret } = await import("./service-required-secrets.service");
      respawnServicesUsingSecret(input.workspaceId, secret.key).catch(console.error);
    }

    return secret;
  } catch (err: any) {
    if (err?.code === "23505") {
      throw new ValidationError("A secret with that key already exists.");
    }
    throw err;
  }
}

export async function deleteSecret(
  id: string,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  if (!isValidUuid(id) || !isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return false;
  }

  const result = await db
    .delete(secrets)
    .where(
      and(
        eq(secrets.id, id),
        eq(secrets.workspaceId, workspaceId),
        eq(secrets.userId, userId)
      )
    )
    .returning({ id: secrets.id });

  return result.length > 0;
}

function mapRowToSecret(row: SecretRow): Secret {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    key: row.key,
    value: safeDecrypt(row.valueEncrypted),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function safeDecrypt(valueEncrypted: string | null): string {
  if (!valueEncrypted) {
    return "";
  }
  try {
    return decryptSecret(valueEncrypted);
  } catch (err) {
    console.error("Failed to decrypt secret value", err);
    return "";
  }
}

