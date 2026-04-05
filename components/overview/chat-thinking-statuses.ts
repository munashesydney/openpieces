/**
 * Hardcoded status lines shown while the assistant is preparing a response
 * (before streamed text appears). Edit this list to change copy or order.
 */
export const CHAT_THINKING_STATUSES = [
  "Reading your message…",
  "Gathering context…",
  "Reasoning through the answer…",
  "Structuring the response…",
  "Almost ready…",
] as const;

/** Shown while tools / function calls are in flight (job still running). */
export const CHAT_THINKING_TOOL_STATUSES = [
  "Calling tools…",
  "Running actions…",
  "Waiting on results…",
  "Continuing…",
] as const;

export type ChatThinkingStatus = (typeof CHAT_THINKING_STATUSES)[number];
