import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getKey(): Buffer {
  const key = process.env.SECRETS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("SECRETS_ENCRYPTION_KEY environment variable is not set");
  }

  const keyBuffer = Buffer.from(key, "utf8");
  if (keyBuffer.length < KEY_LENGTH) {
    throw new Error("SECRETS_ENCRYPTION_KEY must be at least 32 bytes long");
  }

  return keyBuffer.subarray(0, KEY_LENGTH);
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Store as iv:ciphertext:tag, all base64
  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    authTag.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivB64, encryptedB64, tagB64] = payload.split(":");
  if (!ivB64 || !encryptedB64 || !tagB64) {
    throw new Error("Invalid encrypted secret format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

