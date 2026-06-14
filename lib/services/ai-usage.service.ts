import { db } from "@/lib/db";
import { aiUsage } from "@/lib/db/schema";
import { getModelPricing } from "@/lib/ai-chat/model-context";
import { desc, eq, sql } from "drizzle-orm";

export async function recordAiUsage(input: {
  workspaceId: string;
  userId?: string | null;
  chatId?: string | null;
  messageId?: string | null;
  opencodeSessionId?: string | null;
  agentType: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
  cost?: number; // allow pre-calculated cost (e.g. from OpenCode)
}) {
  let cost = input.cost ?? 0;
  
  if (cost === 0) {
    const pricing = await getModelPricing(input.model);
    if (pricing) {
      if ((input.promptTokens && input.promptTokens > 0) || (input.completionTokens && input.completionTokens > 0)) {
        cost = ((input.promptTokens || 0) * pricing.prompt) + ((input.completionTokens || 0) * pricing.completion);
      } else if (input.totalTokens && input.totalTokens > 0) {
        // Fallback for providers that only return totalTokens
        const avgPrice = (pricing.prompt + pricing.completion) / 2;
        cost = input.totalTokens * avgPrice;
      }
    }
  }

  const promptTokens = input.promptTokens || 0;
  const completionTokens = input.completionTokens || 0;
  const totalTokens = input.totalTokens ?? (promptTokens + completionTokens);

  await db.insert(aiUsage).values({
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    chatId: input.chatId ?? null,
    messageId: input.messageId ?? null,
    opencodeSessionId: input.opencodeSessionId ?? null,
    agentType: input.agentType,
    model: input.model,
    promptTokens,
    completionTokens,
    totalTokens,
    cost,
  });
}

export async function getWorkspaceAiUsageMetrics(workspaceId: string) {
  const totalCostResult = await db
    .select({ totalCost: sql<number>`sum(${aiUsage.cost})`, totalTokens: sql<number>`sum(${aiUsage.totalTokens})` })
    .from(aiUsage)
    .where(eq(aiUsage.workspaceId, workspaceId));

  const totalCost = totalCostResult[0]?.totalCost ?? 0;
  const totalTokens = totalCostResult[0]?.totalTokens ?? 0;

  const byAgent = await db
    .select({
      agentType: aiUsage.agentType,
      cost: sql<number>`sum(${aiUsage.cost})`,
      tokens: sql<number>`sum(${aiUsage.totalTokens})`,
    })
    .from(aiUsage)
    .where(eq(aiUsage.workspaceId, workspaceId))
    .groupBy(aiUsage.agentType);

  return {
    totalCost,
    totalTokens,
    byAgent,
  };
}

export async function getWorkspaceAiUsageRecords(workspaceId: string, limit = 50) {
  return await db
    .select()
    .from(aiUsage)
    .where(eq(aiUsage.workspaceId, workspaceId))
    .orderBy(desc(aiUsage.createdAt))
    .limit(limit);
}
