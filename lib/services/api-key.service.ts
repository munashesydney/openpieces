import { and, eq, desc } from "drizzle-orm";
import { db } from "../db";
import { apiKeys, type NewApiKeyRow, type ApiKeyRow } from "../db/schema";
import { isValidUuid } from "../utils/uuid";
import { encryptSecret, decryptSecret } from "../security/encryption";
import { ValidationError } from "../errors/validation-error";
import crypto from "crypto";

export type ApiKey = {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Generate a cryptographically random API key string. */
function generateApiKey(): string {
  const bytes = crypto.randomBytes(32);
  return `op_api_${bytes.toString("base64url")}`;
}

/** Get all API keys for a workspace + user. Never returns full key values. */
export async function getApiKeys(
  workspaceId: string,
  userId: string,
): Promise<ApiKey[]> {
  if (!isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return [];
  }

  const rows = await db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.workspaceId, workspaceId), eq(apiKeys.userId, userId)),
    )
    .orderBy(desc(apiKeys.createdAt));

  return rows.map(mapRowToApiKey);
}

/** Get a single API key by ID. Never returns the full key value. */
export async function getApiKeyById(
  id: string,
  workspaceId: string,
  userId: string,
): Promise<ApiKey | null> {
  if (!isValidUuid(id) || !isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return null;
  }

  const rows = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.workspaceId, workspaceId),
        eq(apiKeys.userId, userId),
      ),
    )
    .limit(1);

  const row = rows[0];
  return row ? mapRowToApiKey(row) : null;
}

/**
 * Create a new API key.
 * Generates a random key, encrypts it, stores the encrypted version.
 * Returns the full plaintext key — this is the ONLY time it's visible.
 */
export async function createApiKey(input: {
  workspaceId: string;
  userId: string;
  name: string;
}): Promise<{ apiKey: ApiKey; plaintextKey: string }> {
  const name = input.name.trim();
  if (!name) {
    throw new ValidationError("Key name is required.");
  }
  if (name.length > 128) {
    throw new ValidationError("Key name is too long (max 128 characters).");
  }

  const plaintextKey = generateApiKey();
  const encrypted = encryptSecret(plaintextKey);
  const keyHashVal = crypto
    .createHash("sha256")
    .update(plaintextKey)
    .digest("hex");

  // Extract prefix/suffix for masked display
  const keyPrefix = plaintextKey.slice(0, 11); // "op_api_xxxx"
  const keySuffix = plaintextKey.slice(-4);

  const now = new Date();
  const toInsert: NewApiKeyRow = {
    workspaceId: input.workspaceId,
    userId: input.userId,
    name,
    keyEncrypted: encrypted,
    keyHash: keyHashVal,
    keyPrefix,
    keySuffix,
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const [row] = await db.insert(apiKeys).values(toInsert).returning();

  return {
    apiKey: mapRowToApiKey(row),
    plaintextKey,
  };
}

/**
 * Delete an API key by ID. Returns true if a row was actually deleted.
 */
export async function deleteApiKey(
  id: string,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  if (!isValidUuid(id) || !isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return false;
  }

  const result = await db
    .delete(apiKeys)
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.workspaceId, workspaceId),
        eq(apiKeys.userId, userId),
      ),
    )
    .returning({ id: apiKeys.id });

  return result.length > 0;
}

/**
 * Decrypt and return the full API key value.
 * Used only for the "reveal" action — should be used sparingly.
 */
export async function revealApiKey(
  id: string,
  workspaceId: string,
  userId: string,
): Promise<string | null> {
  if (!isValidUuid(id) || !isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return null;
  }

  const rows = await db
    .select({ keyEncrypted: apiKeys.keyEncrypted })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.workspaceId, workspaceId),
        eq(apiKeys.userId, userId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  try {
    return decryptSecret(row.keyEncrypted);
  } catch (err) {
    console.error("Failed to decrypt API key", err);
    return null;
  }
}

/**
 * Authenticate a request by API key.
 * Returns { userId, workspaceId } if valid, null if not found.
 */
export async function authenticateByApiKey(
  rawKey: string,
): Promise<{ userId: string; workspaceId: string } | null> {
  const keyHashVal = crypto.createHash("sha256").update(rawKey).digest("hex");

  const rows = await db
    .select({
      userId: apiKeys.userId,
      workspaceId: apiKeys.workspaceId,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHashVal))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Update lastUsedAt in background
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.keyHash, keyHashVal))
    .then(() => {})
    .catch(() => {});

  return { userId: row.userId, workspaceId: row.workspaceId };
}

function mapRowToApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    keySuffix: row.keySuffix,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
