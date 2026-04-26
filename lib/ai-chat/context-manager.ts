import { getModelLimits } from "./model-context";

export interface ContextInfo {
  usedTokens: number;
  maxTokens: number;
  percentage: number;
  status: "ok" | "warning" | "critical";
  needsCompaction: boolean;
}

export function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part)
          return String((part as { text: unknown }).text);
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

/**
 * Estimate token count using split ratios:
 * - Natural text: ~3 chars per token
 * - Structured data (JSON, code): ~1.5 chars per token
 *
 * We detect structured content by checking for JSON-like patterns.
 */
function estimateContentTokens(content: string): number {
  if (!content) return 0;

  // Heuristic: if the content looks like JSON or code, use a tighter ratio
  const structuredIndicators = ["{", "[", '":', "\\n  "];
  const isStructured = structuredIndicators.some((ind) =>
    content.includes(ind),
  );

  const ratio = isStructured ? 1.5 : 3;
  return Math.ceil(content.length / ratio);
}

export function estimateMessagesTokens(
  messages: { content: unknown }[],
  systemPrompt: string,
): number {
  let textContentTokens = 0;
  let toolInputTokensSum = 0;
  let toolOutputTokensSum = 0;
  let toolTotalCount = 0;

  const messagesTokens = messages.reduce((sum, m) => {
    let messageTotal = 0;

    const content = m.content;
    if (Array.isArray(content)) {
      // Content-block format: tool calls/results embedded in content array
      for (const block of content) {
        if (typeof block === "object" && block !== null) {
          if (block.type === "text") {
            const t = estimateContentTokens(block.text ?? "");
            textContentTokens += t;
            messageTotal += t;
          } else if (block.type === "tool-call") {
            toolTotalCount++;
            const inputStr =
              typeof block.input === "string"
                ? block.input
                : JSON.stringify(block.input ?? {});
            const tCost = estimateContentTokens(inputStr);
            toolInputTokensSum += tCost;
            messageTotal += tCost;
          } else if (block.type === "tool-result") {
            const output = block.output ?? {};
            let outputStr = "";
            if (output.type === "text" || output.type === "error-text") {
              outputStr = output.value ?? "";
            } else if (output.type === "json" || output.type === "error-json") {
              outputStr = JSON.stringify(output.value ?? null);
            } else if (typeof output === "object") {
              outputStr = JSON.stringify(output);
            } else {
              outputStr = String(output);
            }
            const tCost = estimateContentTokens(outputStr);
            toolOutputTokensSum += tCost;
            messageTotal += tCost;
          }
        }
      }
    } else if (typeof content === "string") {
      // Plain string content (user messages)
      const t = estimateContentTokens(content);
      textContentTokens += t;
      messageTotal += t;
    }

    return sum + messageTotal;
  }, 0);

  // System prompt is typically natural text
  const systemTokens = Math.ceil(systemPrompt.length / 3);
  // Add overhead per message (role, formatting) — ~4 tokens each
  const overhead = messages.length * 4;
  // Tool definitions (12 tools with schemas) add ~4000 tokens per request
  const TOOL_DEFINITIONS_OVERHEAD = 4000;
  const finalTotal =
    messagesTokens + systemTokens + overhead + TOOL_DEFINITIONS_OVERHEAD;

  return finalTotal;
}

export async function getContextInfo(
  model: string,
  messages: { content: unknown }[],
  systemPrompt: string,
): Promise<ContextInfo> {
  const limits = await getModelLimits(model);

  // maxTokens for display: context window in tokens
  const maxTokens = limits.context;

  // usedTokens: token estimate from messages
  const usedTokens = estimateMessagesTokens(messages, systemPrompt);

  const percentage = Math.min((usedTokens / maxTokens) * 100, 100);

  let status: ContextInfo["status"] = "ok";
  if (percentage >= 80) status = "critical";
  else if (percentage >= 60) status = "warning";

  const needsCompaction = percentage >= 80;

  return { usedTokens, maxTokens, percentage, status, needsCompaction };
}
