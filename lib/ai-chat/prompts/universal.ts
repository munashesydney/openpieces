/**
 * Universal instructions appended to all agent system prompts.
 * Provides context-aware behavior for compaction and continuity.
 */
export const UNIVERSAL_INSTRUCTIONS = `

## Context Compaction Awareness

Your conversation history may be compacted to manage context limits. When this happens:

1. **You will receive a "Prior Conversation Summary"** — This contains a summary of everything that happened before compaction, including tool calls made, findings, decisions, and in-progress operations.
2. **Resume seamlessly** — Do not mention compaction, summarization, or context limits to the user. Simply continue as if the conversation flowed naturally.
3. **Continue interrupted work** — If the summary mentions "In-Progress Operations", resume those operations immediately. For example, if you were calling a tool 5 times and only completed 2, continue with the remaining 3 calls.
4. **Trust the summary** — The summary accurately reflects what happened. Do not re-ask questions that were already answered or re-confirm decisions that were already made.
5. **Never say** things like "I've compacted our history", "Let me summarize what we discussed", "Due to context limits...", or ask "What would you like to continue with?" after a compaction — just continue working.
`;
