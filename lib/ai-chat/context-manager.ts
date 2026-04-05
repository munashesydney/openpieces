const CONTEXT_CACHE = new Map<string, { contextLength: number; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CHAR_TOKEN_RATIO = 4;

export interface ContextInfo {
  usedChars: number;
  maxChars: number;
  percentage: number;
  status: "ok" | "warning" | "critical";
  needsCompaction: boolean;
}

export async function getModelContextLength(model: string): Promise<number> {
  const [creator, modelName] = model.split("/");

  const cached = CONTEXT_CACHE.get(model);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.contextLength;
  }

  const response = await fetch(
    `https://ai-gateway.vercel.sh/v1/models/${creator}/${modelName}/endpoints`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    // Fallback to a safe default if the API call fails
    return 1_000_000;
  }

  const json = await response.json();
  const contextLength = json.data.endpoints[0].context_length as number;

  CONTEXT_CACHE.set(model, { contextLength, fetchedAt: Date.now() });
  return contextLength;
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

export function estimateTokens(content: string): number {
  return Math.ceil(content.length / CHAR_TOKEN_RATIO);
}

export function estimateMessagesTokens(
  messages: { content: unknown }[],
  systemPrompt: string
): number {
  const messagesTokens = messages.reduce(
    (sum, m) => sum + estimateTokens(extractTextContent(m.content)),
    0
  );
  const systemTokens = estimateTokens(systemPrompt);
  return messagesTokens + systemTokens;
}

export async function getContextInfo(
  model: string,
  messages: { content: unknown }[],
  systemPrompt: string
): Promise<ContextInfo> {
  const contextLength = await getModelContextLength(model);
  const maxChars = contextLength * CHAR_TOKEN_RATIO;
  const usedChars = estimateMessagesTokens(messages, systemPrompt) * CHAR_TOKEN_RATIO;
  const percentage = Math.min((usedChars / maxChars) * 100, 100);

  let status: ContextInfo["status"] = "ok";
  if (percentage >= 90) status = "critical";
  else if (percentage >= 70) status = "warning";

  const needsCompaction = percentage >= 90;

  return { usedChars, maxChars, percentage, status, needsCompaction };
}
