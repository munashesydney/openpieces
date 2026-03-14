export type AiChatStatus = "idle" | "pending" | "processing" | "completed" | "failed";

export type AiMessageRole = "user" | "assistant";

export type AiMessageStatus = "pending" | "streaming" | "complete" | "error";

export type AiToolCall = {
  toolCallId: string;
  toolName: string;
  input: unknown;
};

export type AiToolResult = {
  toolCallId: string;
  toolName: string;
  output: unknown;
  error?: string | null;
};

export type AiChatListItem = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  status: AiChatStatus;
  error: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiChatMessage = {
  id: string;
  chatId: string;
  role: AiMessageRole;
  status: AiMessageStatus;
  content: string;
  toolCalls: AiToolCall[];
  toolResults: AiToolResult[];
  createdAt: string;
  updatedAt: string;
};
