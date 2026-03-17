import { mkdir, open, readFile, truncate, writeFile } from "fs/promises";
import path from "path";

const LOG_ROOT = path.join(process.cwd(), "tmp", "service-logs");

function getServiceDirectory(workspaceId: string): string {
  return path.join(LOG_ROOT, workspaceId);
}

export function getServiceLogPath(workspaceId: string, serviceId: string): string {
  return path.join(getServiceDirectory(workspaceId), `${serviceId}.log`);
}

async function ensureServiceLogDirectory(workspaceId: string): Promise<void> {
  await mkdir(getServiceDirectory(workspaceId), { recursive: true });
}

export async function resetServiceLog(workspaceId: string, serviceId: string): Promise<void> {
  await ensureServiceLogDirectory(workspaceId);
  const logPath = getServiceLogPath(workspaceId, serviceId);

  try {
    await truncate(logPath, 0);
  } catch {
    await writeFile(logPath, "", "utf8");
  }
}

export async function appendServiceLog(
  workspaceId: string,
  serviceId: string,
  level: "info" | "error",
  message: string
): Promise<void> {
  await ensureServiceLogDirectory(workspaceId);
  const logPath = getServiceLogPath(workspaceId, serviceId);
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
  workspaceId: string,
  serviceId: string,
  maxBytes = 48 * 1024
): Promise<{ content: string; nextOffset: number }> {
  const logPath = getServiceLogPath(workspaceId, serviceId);

  try {
    const content = await readFile(logPath, "utf8");
    const trimmed = content.length > maxBytes ? content.slice(-maxBytes) : content;
    return { content: trimmed, nextOffset: Buffer.byteLength(content) };
  } catch {
    return { content: "", nextOffset: 0 };
  }
}

export async function readServiceLogChunk(
  workspaceId: string,
  serviceId: string,
  offset: number
): Promise<{ content: string; nextOffset: number }> {
  const logPath = getServiceLogPath(workspaceId, serviceId);

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
