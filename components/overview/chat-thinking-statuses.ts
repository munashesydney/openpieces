/** Simple status shown while the assistant is preparing a response. */
export const CHAT_THINKING_STATUSES = ["Thinking…"] as const;

/** Shown while tools / function calls are in flight (job still running). */
export const CHAT_THINKING_TOOL_STATUSES = ["Working…"] as const;

export type ChatThinkingStatus = (typeof CHAT_THINKING_STATUSES)[number];
