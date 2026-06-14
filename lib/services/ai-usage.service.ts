import { db } from "@/lib/db";
import { aiUsage } from "@/lib/db/schema";
import { getModelPricing } from "@/lib/ai-chat/model-context";
import { desc, eq, sql, gte, lte, and, inArray } from "drizzle-orm";

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
      if (
        (input.promptTokens && input.promptTokens > 0) ||
        (input.completionTokens && input.completionTokens > 0)
      ) {
        cost =
          (input.promptTokens || 0) * pricing.prompt +
          (input.completionTokens || 0) * pricing.completion;
      } else if (input.totalTokens && input.totalTokens > 0) {
        // Fallback for providers that only return totalTokens
        const avgPrice = (pricing.prompt + pricing.completion) / 2;
        cost = input.totalTokens * avgPrice;
      }
    }
  }

  const promptTokens = input.promptTokens || 0;
  const completionTokens = input.completionTokens || 0;
  const totalTokens = input.totalTokens ?? promptTokens + completionTokens;

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

export async function getWorkspaceAiUsageMetrics(
  workspaceId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const conditions = [eq(aiUsage.workspaceId, workspaceId)];
  if (startDate) conditions.push(gte(aiUsage.createdAt, startDate));
  if (endDate) conditions.push(lte(aiUsage.createdAt, endDate));

  const totalCostResult = await db
    .select({
      totalCost: sql<number>`sum(${aiUsage.cost})`,
      totalTokens: sql<number>`sum(${aiUsage.totalTokens})`,
    })
    .from(aiUsage)
    .where(and(...conditions));

  const totalCost = totalCostResult[0]?.totalCost ?? 0;
  const totalTokens = totalCostResult[0]?.totalTokens ?? 0;

  const byAgent = await db
    .select({
      agentType: aiUsage.agentType,
      cost: sql<number>`sum(${aiUsage.cost})`,
      tokens: sql<number>`sum(${aiUsage.totalTokens})`,
    })
    .from(aiUsage)
    .where(and(...conditions))
    .groupBy(aiUsage.agentType);

  return {
    totalCost,
    totalTokens,
    byAgent,
  };
}

export async function getWorkspacesCosts(
  workspaceIds: string[],
): Promise<Map<string, { totalCost: number; totalTokens: number }>> {
  if (workspaceIds.length === 0) return new Map();

  const result = await db
    .select({
      workspaceId: aiUsage.workspaceId,
      totalCost: sql<number>`sum(${aiUsage.cost})`,
      totalTokens: sql<number>`sum(${aiUsage.totalTokens})`,
    })
    .from(aiUsage)
    .where(inArray(aiUsage.workspaceId, workspaceIds))
    .groupBy(aiUsage.workspaceId);

  const map = new Map<string, { totalCost: number; totalTokens: number }>();
  for (const row of result) {
    map.set(row.workspaceId, {
      totalCost: row.totalCost,
      totalTokens: row.totalTokens,
    });
  }
  return map;
}

export async function getWorkspaceAiUsageRecords(
  workspaceId: string,
  page = 1,
  pageSize = 50,
  startDate?: Date,
  endDate?: Date,
) {
  const conditions = [eq(aiUsage.workspaceId, workspaceId)];
  if (startDate) conditions.push(gte(aiUsage.createdAt, startDate));
  if (endDate) conditions.push(lte(aiUsage.createdAt, endDate));

  const records = await db
    .select()
    .from(aiUsage)
    .where(and(...conditions))
    .orderBy(desc(aiUsage.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiUsage)
    .where(and(...conditions));

  return {
    data: records,
    total: Number(countResult?.count || 0),
  };
}
