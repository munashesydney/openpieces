export type AiChatStatus =
  | "idle"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "stopped";

export type AiMessageRole = "user" | "assistant";

export type AiMessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "error"
  | "compacted";

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

export type FileAttachment = {
  name: string;
  mediaType: string;
  url: string;
  size: number;
};

export type AiChatMessage = {
  id: string;
  chatId: string;
  role: AiMessageRole;
  status: AiMessageStatus;
  content: string;
  reasoning: string | null;
  toolCalls: AiToolCall[];
  toolResults: AiToolResult[];
  attachments: FileAttachment[];
  createdAt: string;
  updatedAt: string;
};
