/**
 * Tool output truncation without file persistence.
 *
 * When tool results are too large, they are truncated and a hint is
 * returned to the model suggesting it use pagination or filters.
 */

// Maximum character length for tool outputs before truncation.
// Keep conservative — tool results (JSON lists) are token-dense (~1:1 char:token).
// With truncation at the tool source (registry.ts), this limits what the AI SDK
// sees in its internal multi-step context chain.
const MAX_TOOL_OUTPUT_CHARS = 10000;

export interface TruncationResult {
  content: string;
  truncated: boolean;
}

export function truncateToolOutput(output: string): TruncationResult {
  if (output.length <= MAX_TOOL_OUTPUT_CHARS) {
    return { content: output, truncated: false };
  }

  // Truncate to MAX_TOOL_OUTPUT_CHARS and add hint
  const truncatedContent = output.slice(0, MAX_TOOL_OUTPUT_CHARS);
  const hint =
    "\n\n[Output truncated. Consider using pagination (page, limit) or filters to reduce the number of results.]";

  return {
    content: truncatedContent + hint,
    truncated: true,
  };
}
