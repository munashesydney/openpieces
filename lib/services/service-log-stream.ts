import { mkdir, open, readFile, truncate, writeFile } from "fs/promises";
import path from "path";

const LOG_ROOT = path.join(process.cwd(), "pieces");

function getServiceDirectory(directory: string): string {
  return path.join(LOG_ROOT, directory, "logs");
}

export function getServiceLogPath(directory: string): string {
  const today = new Date().toISOString().split("T")[0];
  return path.join(getServiceDirectory(directory), `${today}.log`);
}

async function ensureServiceLogDirectory(directory: string): Promise<void> {
  await mkdir(getServiceDirectory(directory), { recursive: true });
}

export async function resetServiceLog(directory: string): Promise<void> {
  await ensureServiceLogDirectory(directory);
  const logPath = getServiceLogPath(directory);

  try {
    await truncate(logPath, 0);
  } catch {
    await writeFile(logPath, "", "utf8");
  }
}

export async function appendServiceLog(
  directory: string,
  level: "info" | "error",
  message: string
): Promise<void> {
  // Mirror to console for visibility in Docker/Coolify logs if enabled
  if (process.env.DEBUG_LOGS === "true") {
    const consoleMsg = `[service:${directory}] ${message}`;
    if (level === "error") {
      console.error(consoleMsg);
    } else {
      console.log(consoleMsg);
    }
  }

  await ensureServiceLogDirectory(directory);
  const logPath = getServiceLogPath(directory);
  const timestamp = new Date().toISOString();
  const normalized = message.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const formatted = lines
    .filter((line) => line.length > 0)
    .map((line) => `[${timestamp}] [${level}] ${line}`)
    .join("\n");

  if (!formatted) {
    return;
  }

  const file = await open(logPath, "a");
  try {
    await file.appendFile(`${formatted}\n`, "utf8");
  } finally {
    await file.close();
  }
}

export async function readServiceLogTail(
  directory: string,
  maxBytes = 48 * 1024
): Promise<{ content: string; nextOffset: number }> {
  const logPath = getServiceLogPath(directory);

  try {
    const content = await readFile(logPath, "utf8");
    const trimmed = content.length > maxBytes ? content.slice(-maxBytes) : content;
    return { content: trimmed, nextOffset: Buffer.byteLength(content) };
  } catch {
    return { content: "", nextOffset: 0 };
  }
}

export async function readServiceLogChunk(
  directory: string,
  offset: number
): Promise<{ content: string; nextOffset: number }> {
  const logPath = getServiceLogPath(directory);

  try {
    const file = await open(logPath, "r");
    try {
      const stat = await file.stat();
      const nextStart = stat.size < offset ? 0 : offset;
      const bytesToRead = stat.size - nextStart;

      if (bytesToRead <= 0) {
        return { content: "", nextOffset: stat.size };
      }

      const buffer = Buffer.alloc(bytesToRead);
      const { bytesRead } = await file.read(buffer, 0, bytesToRead, nextStart);
      return {
        content: buffer.toString("utf8", 0, bytesRead),
        nextOffset: stat.size,
      };
    } finally {
      await file.close();
    }
  } catch {
    return { content: "", nextOffset: 0 };
  }
}
