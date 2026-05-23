// lib/services/opencode.service.ts

export interface OpenCodeSession {
  id: string;
  name?: string;
  directory?: string;
  created_at: string;
  status: string;
  // Other fields depend on the exact OpenAPI spec of OpenCode
  [key: string]: any;
}

export interface OpenCodeMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  // Other fields
  [key: string]: any;
}

export function getBaseUrl() {
  return process.env.OPENCODE_INTERNAL_URL || "http://opencode:4096";
}

export function getAuthHeaders() {
  const username = process.env.OPENCODE_SERVER_USERNAME || "opencode";
  const password = process.env.OPENCODE_SERVER_PASSWORD || "";

  if (!password) {
    console.warn(
      "OPENCODE_SERVER_PASSWORD is not set. API calls may fail if auth is required.",
    );
  }

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");

  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

export async function listSessions(): Promise<OpenCodeSession[]> {
  const response = await fetch(`${getBaseUrl()}/session`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to list sessions:", text);
    throw new Error(
      `OpenCode API error: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse sessions JSON:", text);
    return [];
  }
}

export async function createSession(): Promise<OpenCodeSession> {
  const response = await fetch(`${getBaseUrl()}/session`, {
    method: "POST",
    headers: getAuthHeaders(),
    cache: "no-store",
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to create session:", text);
    throw new Error(
      `OpenCode API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function getMessages(sessionId: string): Promise<any[]> {
  const response = await fetch(`${getBaseUrl()}/session/${sessionId}/message`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to get messages for session ${sessionId}:`, text);
    throw new Error(
      `OpenCode API error: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse messages JSON:", text);
    return [];
  }
}

type MessagePart = { type: string; text?: string };

function extractContentFromParts(parts: MessagePart[]): string {
  return (parts || [])
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n");
}

/**
 * Formats messages for AI consumption: user, assistant, user, assistant...
 * - Keeps all user messages
 * - Only keeps the last assistant message (filters out intermediate streaming parts)
 */
export function getMessagesForAi(
  messages: OpenCodeMessage[],
): { role: string; content: string }[] {
  const result: { role: string; content: string }[] = [];
  let lastAssistantMessage: { role: string; content: string } | null = null;

  for (const msg of messages) {
    const role = (msg as any).info?.role;
    if (role === "user") {
      if (lastAssistantMessage) {
        result.push(lastAssistantMessage);
        lastAssistantMessage = null;
      }
      result.push({
        role: "user",
        content: extractContentFromParts(msg.parts),
      });
    } else if (role === "assistant") {
      lastAssistantMessage = {
        role: "assistant",
        content: extractContentFromParts(msg.parts),
      };
    }
  }

  if (lastAssistantMessage) {
    result.push(lastAssistantMessage);
  }

  return result;
}

// OpenCode runs with working_dir at the pieces volume root (see docker-compose opencode.working_dir).
// `directory` from the DB is relative to that root (e.g. userId/workspaceId/slug), matching `pieces/<directory>` on the app/worker side — do not prefix "pieces/" here.
const DIRECTORY_INSTRUCTION_PREFIX =
  "Before doing anything else: ensure the directory '";

const DIRECTORY_INSTRUCTION_SUFFIX =
  "' exists (create it if needed), then cd into it. You are only allowed to work inside this directory.\n\n";

export async function sendMessage(
  sessionId: string,
  content: string,
): Promise<OpenCodeMessage> {
  const { getServiceId } =
    await import("@/lib/services/opencode-session.service");
  const { db } = await import("@/lib/db");
  const { services } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const { getWorkspaceSettings } =
    await import("@/lib/services/workspace-settings.service");

  let modelID = "deepseek/deepseek-v3.2"; // Fallback to new standard if not set
  const serviceId = await getServiceId(sessionId);
  if (serviceId) {
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);
    if (service?.workspaceId) {
      const settings = await getWorkspaceSettings(service.workspaceId);
      if (settings?.defaultModel) {
        modelID = settings.defaultModel;
      }
    }
  }

  const response = await fetch(`${getBaseUrl()}/session/${sessionId}/message`, {
    method: "POST",
    headers: getAuthHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      parts: [{ type: "text", text: content }],
      model: {
        providerID: "vercel",
        modelID: modelID,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to send message to session ${sessionId}:`, text);
    throw new Error(
      `OpenCode API error: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse send message JSON:", text);
    throw new Error("Invalid format returned from OpenCode API.");
  }
}

// Business logic for sending a message with context - used by the API route
export async function sendMessageWithContext(
  sessionId: string,
  content: string,
  userId?: string,
): Promise<void> {
  // IMPORTANT: Check if the session's service has another working session before anything else.
  // Uses an advisory lock so two concurrent requests don't both pass the check.
  const { getServiceId } =
    await import("@/lib/services/opencode-session.service");
  const { db } = await import("@/lib/db");
  const { sql, eq, and, ne } = await import("drizzle-orm");
  const { opencodeSessions } = await import("@/lib/db/schema");
  const serviceId = await getServiceId(sessionId);
  if (serviceId) {
    await db.transaction(async (tx) => {
      // Transaction-scoped advisory lock – blocks until any other tx holding
      // the same lock finishes, then auto-releases when this tx commits.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${serviceId}))`,
      );

      const rows = await tx
        .select({ sessionId: opencodeSessions.sessionId })
        .from(opencodeSessions)
        .where(
          and(
            eq(opencodeSessions.serviceId, serviceId),
            eq(opencodeSessions.status, "busy"),
            ne(opencodeSessions.sessionId, sessionId),
          ),
        )
        .limit(1);

      if (rows.length > 0) {
        throw new Error(
          "Cannot send message: service is already processing another request",
        );
      }
    });
  }

  const { getDirectory } =
    await import("@/lib/services/opencode-session.service");

  const directory = await getDirectory(sessionId);
  if (!directory) {
    throw new Error(
      "No directory set for this session. Create the session with a working directory.",
    );
  }

  const existingMessages = await getMessages(sessionId);
  const isFirstMessage =
    !Array.isArray(existingMessages) || existingMessages.length === 0;

  let fullContent = content;

  if (isFirstMessage) {
    // If userId is not provided, we can't get the context - this should only happen
    // when called from the UI where there's a valid session
    if (!userId) {
      const { requireUser } = await import("@/lib/services/auth.service");
      const user = await requireUser();
      userId = user.id;
    }

    // Derive workspaceId from the session's service instead of the user's default workspace.
    // Each session is tied to a service that belongs to exactly one workspace, so this is
    // always correct even when the user has multiple workspaces.
    if (!serviceId) {
      throw new Error(
        "Cannot determine workspace: session has no associated service.",
      );
    }
    const { getServiceByIdOnly } =
      await import("@/lib/services/service.service");
    const service = await getServiceByIdOnly(serviceId);
    if (!service) {
      throw new Error(
        `Cannot determine workspace: service "${serviceId}" not found.`,
      );
    }
    const workspaceId = service.workspaceId;
    const contextBlock =
      `__OPENPIECES_CONTEXT_START__\n` +
      `workspaceId=${workspaceId}\n` +
      `userId=${userId}\n` +
      `serviceId=${serviceId ?? "unknown"}\n` +
      `__OPENPIECES_CONTEXT_END__\n\n`;

    fullContent =
      DIRECTORY_INSTRUCTION_PREFIX +
      directory +
      DIRECTORY_INSTRUCTION_SUFFIX +
      contextBlock +
      content;
  }

  await sendMessage(sessionId, fullContent);
}
