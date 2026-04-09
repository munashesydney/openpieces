import { getModelLimits, getModelCharTokenRatio } from "./model-context";

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

  // maxTokens for display: context window in tokens
  const maxTokens = limits.context;

  // usedTokens: token estimate from messages
  const usedTokens = estimateMessagesTokens(messages, systemPrompt, ratio);

  const percentage = Math.min((usedTokens / maxTokens) * 100, 100);

  let status: ContextInfo["status"] = "ok";
  if (percentage >= 90) status = "critical";
  else if (percentage >= 70) status = "warning";

  const needsCompaction = percentage >= 90;

  return { usedTokens, maxTokens, percentage, status, needsCompaction };
}
