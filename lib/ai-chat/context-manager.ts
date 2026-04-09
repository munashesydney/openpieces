import { getModelLimits, getModelCharTokenRatio } from "./model-context";

export interface ContextInfo {
  usedChars: number;
  maxChars: number;
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
        if (part && typeof part === "object" && "text" in part) return String((part as { text: unknown }).text);
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

export function estimateTokens(content: string, charTokenRatio: number): number {
  return Math.ceil(content.length / charTokenRatio);
}

export function estimateMessagesTokens(
  messages: { content: unknown }[],
  systemPrompt: string,
  charTokenRatio: number
): number {
  const messagesTokens = messages.reduce(
    (sum, m) => sum + estimateTokens(extractTextContent(m.content), charTokenRatio),
    0
  );
  const systemTokens = estimateTokens(systemPrompt, charTokenRatio);
  return messagesTokens + systemTokens;
}

export async function getContextInfo(
  model: string,
  messages: { content: unknown }[],
  systemPrompt: string
): Promise<ContextInfo> {
  const limits = await getModelLimits(model);
  const ratio = getModelCharTokenRatio(model);

  // maxChars for display: context window in tokens * char/token ratio = chars
  // e.g., 128000 tokens * 3.5 = ~448000 chars for DeepSeek
  const maxChars = limits.context * ratio;

  // usedChars: convert message chars to token estimate, then back to chars
  // This gives us usedChars in the same unit as maxChars
  const estimatedTokens = estimateMessagesTokens(messages, systemPrompt, ratio);
  const usedChars = estimatedTokens * ratio;

  const percentage = Math.min((usedChars / maxChars) * 100, 100);

  let status: ContextInfo["status"] = "ok";
  if (percentage >= 90) status = "critical";
  else if (percentage >= 70) status = "warning";

  const needsCompaction = percentage >= 90;

  return { usedChars, maxChars, percentage, status, needsCompaction };
}
