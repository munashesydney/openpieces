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

function getBaseUrl() {
  return process.env.OPENCODE_INTERNAL_URL || "http://localhost:4096";
}

function getAuthHeaders() {
  const username = process.env.OPENCODE_SERVER_USERNAME || "opencode";
  const password = process.env.OPENCODE_SERVER_PASSWORD || "";
  
  if (!password) {
    console.warn("OPENCODE_SERVER_PASSWORD is not set. API calls may fail if auth is required.");
  }

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  
  return {
    "Authorization": `Basic ${credentials}`,
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
    throw new Error(`OpenCode API error: ${response.status} ${response.statusText}`);
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
    throw new Error(`OpenCode API error: ${response.status} ${response.statusText}`);
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
    throw new Error(`OpenCode API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse messages JSON:", text);
    return [];
  }
}

export async function sendMessage(sessionId: string, content: string): Promise<OpenCodeMessage> {
  const response = await fetch(`${getBaseUrl()}/session/${sessionId}/message`, {
    method: "POST",
    headers: getAuthHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      parts: [{ type: "text", text: content }],
      model: {
        providerID: "deepseek",
        modelID: "deepseek-chat"
      }
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to send message to session ${sessionId}:`, text);
    throw new Error(`OpenCode API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse send message JSON:", text);
    throw new Error("Invalid format returned from OpenCode API.");
  }
}
