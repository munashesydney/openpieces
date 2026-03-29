import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import { embed } from "ai";
import { db } from "@/lib/db";
import { activityLog, brain, brainSettings, type Brain, type BrainSettings } from "@/lib/db/schema";
import { isValidUuid } from "@/lib/utils/uuid";
import { createAiChat, appendUserMessageAndMarkPending } from "@/lib/services/chat.service";
import { enqueueChatExecution } from "@/lib/queues/pg-boss";
import { getWorkspaceOwnerId } from "@/lib/services/workspace.service";

// ──────────────────────────────────────────────────────────────
// Brain Settings
// ──────────────────────────────────────────────────────────────

export async function getBrainSettings(workspaceId: string): Promise<BrainSettings | null> {
  if (!isValidUuid(workspaceId)) return null;

  const result = await db
    .select()
    .from(brainSettings)
    .where(eq(brainSettings.workspaceId, workspaceId))
    .limit(1);

  return result[0] ?? null;
}

export async function getOrCreateBrainSettings(workspaceId: string): Promise<BrainSettings> {
  let settings = await getBrainSettings(workspaceId);

  if (!settings) {
    const [created] = await db
      .insert(brainSettings)
      .values({ workspaceId })
      .returning();
    settings = created;
  }

  return settings;
}

export async function updateBrainSettings(
  workspaceId: string,
  updates: Partial<Pick<BrainSettings, "ingestionEnabled" | "ingestionIntervalMinutes" | "reinforcementEnabled" | "reinforcementIntervalHours">>
): Promise<BrainSettings | null> {
  if (!isValidUuid(workspaceId)) return null;

  const [updated] = await db
    .update(brainSettings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(brainSettings.workspaceId, workspaceId))
    .returning();

  return updated ?? null;
}

export async function updateLastIngestionRun(workspaceId: string): Promise<void> {
  if (!isValidUuid(workspaceId)) return;
  await db
    .update(brainSettings)
    .set({ lastIngestionRun: new Date(), updatedAt: new Date() })
    .where(eq(brainSettings.workspaceId, workspaceId));
}

export async function updateLastReinforcementRun(workspaceId: string): Promise<void> {
  if (!isValidUuid(workspaceId)) return;
  await db
    .update(brainSettings)
    .set({ lastReinforcementRun: new Date(), updatedAt: new Date() })
    .where(eq(brainSettings.workspaceId, workspaceId));
}

// ──────────────────────────────────────────────────────────────
// Activity Log Processing (Ingestion)
// ──────────────────────────────────────────────────────────────

export async function getUnprocessedActivityLogs(workspaceId: string, limit: number = 10): Promise<typeof activityLog.$inferSelect[]> {
  if (!isValidUuid(workspaceId)) return [];

  return db
    .select()
    .from(activityLog)
    .where(
      and(
        eq(activityLog.workspaceId, workspaceId),
        eq(activityLog.processedByBrain, false)
      )
    )
    .orderBy(asc(activityLog.createdAt))
    .limit(limit);
}

export async function markActivityLogsProcessed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  await db
    .update(activityLog)
    .set({ processedByBrain: true })
    .where(inArray(activityLog.id, ids));
}

// ──────────────────────────────────────────────────────────────
// Embedding Generation
// ──────────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  // Use string model identifier - AI SDK will resolve the correct provider
  const { embedding } = await embed({
    model: "text-embedding-3-small",
    value: text,
  });
  return embedding;
}

// ──────────────────────────────────────────────────────────────
// Brain Entry CRUD
// ──────────────────────────────────────────────────────────────

export async function createBrainEntry(data: {
  workspaceId: string;
  type: "fact" | "episode";
  category: "pieces" | "workflows" | "runs" | "credentials" | "general";
  summary: string;
  recordType?: string | null;
  recordId?: string | null;
  tags?: string[];
}): Promise<Brain> {
  // Generate embedding for the summary
  const embedding = await generateEmbedding(data.summary);

  const [entry] = await db
    .insert(brain)
    .values({
      workspaceId: data.workspaceId,
      type: data.type,
      category: data.category,
      summary: data.summary,
      recordType: data.recordType ?? null,
      recordId: data.recordId ?? null,
      embedding,
      tags: data.tags ?? null,
      confidence: 1.0,
      reinforcementCount: 0,
    })
    .returning();

  return entry;
}

export async function getBrainEntries(
  workspaceId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: Brain[]; total: number }> {
  if (!isValidUuid(workspaceId)) return { data: [], total: 0 };

  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(brain)
      .where(eq(brain.workspaceId, workspaceId))
      .orderBy(desc(brain.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(brain)
      .where(eq(brain.workspaceId, workspaceId)),
  ]);

  return {
    data,
    total: Number(countResult[0]?.count ?? 0),
  };
}

export async function getBrainEntryById(brainId: string, workspaceId: string): Promise<Brain | null> {
  if (!isValidUuid(brainId) || !isValidUuid(workspaceId)) return null;

  const result = await db
    .select()
    .from(brain)
    .where(and(eq(brain.id, brainId), eq(brain.workspaceId, workspaceId)))
    .limit(1);

  return result[0] ?? null;
}

export async function searchBrain(
  query: string,
  workspaceId: string,
  limit: number = 10
): Promise<Brain[]> {
  if (!isValidUuid(workspaceId)) return [];

  // Generate embedding for the search query
  const queryEmbedding = await generateEmbedding(query);

  // Calculate similarity using cosine distance
  const similarity = sql<number>`1 - (${cosineDistance(brain.embedding, queryEmbedding)})`;

  const results = await db
    .select({
      entry: brain,
      similarity,
    })
    .from(brain)
    .where(eq(brain.workspaceId, workspaceId))
    .orderBy(desc(similarity))
    .limit(limit);

  return results.map((r) => r.entry);
}

// ──────────────────────────────────────────────────────────────
// Brain Entry Updates
// ──────────────────────────────────────────────────────────────

export async function reinforceBrainEntry(brainId: string, newSummary: string): Promise<Brain | null> {
  if (!isValidUuid(brainId)) return null;

  // Generate new embedding
  const embedding = await generateEmbedding(newSummary);

  const [updated] = await db
    .update(brain)
    .set({
      summary: newSummary,
      embedding,
      confidence: sql`LEAST(confidence + 0.1, 1.0)`,
      reinforcementCount: sql`reinforcement_count + 1`,
      updatedAt: new Date(),
    })
    .where(eq(brain.id, brainId))
    .returning();

  return updated ?? null;
}

export async function deleteBrainEntry(brainId: string): Promise<boolean> {
  if (!isValidUuid(brainId)) return false;

  const [deleted] = await db
    .delete(brain)
    .where(eq(brain.id, brainId))
    .returning({ id: brain.id });

  return !!deleted;
}

// ──────────────────────────────────────────────────────────────
// Brain Worker Helper Functions
// ──────────────────────────────────────────────────────────────

/**
 * Summarize an activity log entry into a brain entry using AI
 */
export async function summarizeActivityLogForBrain(
  activityEntry: typeof activityLog.$inferSelect
): Promise<{ summary: string; type: "fact" | "episode"; category: "pieces" | "workflows" | "runs" | "credentials" | "general"; tags: string[] }> {
  const userId = await getWorkspaceOwnerId(activityEntry.workspaceId);
  if (!userId) {
    throw new Error(`Could not find owner for workspace ${activityEntry.workspaceId}`);
  }

  // Create an AI chat to summarize this activity
  const chat = await createAiChat({
    workspaceId: activityEntry.workspaceId,
    userId,
  }, "orchestrator");

  const activityDescription = `
Activity Type: ${activityEntry.recordType}
Operation: ${activityEntry.operation}
Record ID: ${activityEntry.recordId ?? "N/A"}
Old Data: ${JSON.stringify(activityEntry.oldData ?? {}, null, 2)}
New Data: ${JSON.stringify(activityEntry.newData ?? {}, null, 2)}
Timestamp: ${activityEntry.createdAt}
  `.trim();

  const messageContent = `Please analyze the following activity log entry and create a concise summary suitable for storing in a workspace memory/brain.

The summary should be:
- A factual statement about what happened
- In plain language
- Include relevant details (names, IDs, changes made)
- Categorize as one of: pieces (services/endpoints), workflows, runs (executions), credentials, or general

Activity Log:
${activityDescription}

Respond with a JSON object containing:
{
  "summary": "The factual summary of what happened",
  "type": "fact" or "episode" (use "fact" for single factual statements, "episode" for more complex multi-step events),
  "category": "pieces" | "workflows" | "runs" | "credentials" | "general",
  "tags": ["relevant", "tags", "for", "filtering"]
}`;

  await appendUserMessageAndMarkPending({
    chatId: chat.id,
    content: messageContent,
  });

  await enqueueChatExecution({
    chatId: chat.id,
    workspaceId: activityEntry.workspaceId,
    userId,
  });

  // Wait for the chat to be processed
  // This is a simplified approach - in production you might want to poll or use callbacks
  // For now, we'll just return a placeholder and let the chat worker handle it

  console.log(`[brain] Created summarization chat ${chat.id} for activity ${activityEntry.id}`);

  return {
    summary: `Activity: ${activityEntry.operation} on ${activityEntry.recordType}`,
    type: "fact",
    category: "general",
    tags: [activityEntry.recordType, activityEntry.operation.toLowerCase()],
  };
}

/**
 * Reinforce an existing brain entry using AI
 */
export async function reinforceBrainEntryWithAI(
  brainEntry: Brain
): Promise<{ newSummary: string }> {
  const userId = await getWorkspaceOwnerId(brainEntry.workspaceId);
  if (!userId) {
    throw new Error(`Could not find owner for workspace ${brainEntry.workspaceId}`);
  }

  // Create an AI chat to reinforce this brain entry
  const chat = await createAiChat({
    workspaceId: brainEntry.workspaceId,
    userId,
  }, "orchestrator");

  const messageContent = `Please review and reinforce the following memory entry. This entry has been reinforced ${brainEntry.reinforcementCount} times before and has a confidence score of ${brainEntry.confidence}.

Existing Memory:
${brainEntry.summary}

Based on your knowledge of the workspace, please confirm, refine, or expand this memory. If the memory is still accurate, reaffirm it. If new information contradicts it, update the summary accordingly.

Respond with a JSON object:
{
  "newSummary": "The refined or reaffirmed summary",
  "confidenceBoost": true/false (whether the memory appears accurate based on your knowledge)
}`;

  await appendUserMessageAndMarkPending({
    chatId: chat.id,
    content: messageContent,
  });

  await enqueueChatExecution({
    chatId: chat.id,
    workspaceId: brainEntry.workspaceId,
    userId,
  });

  console.log(`[brain] Created reinforcement chat ${chat.id} for brain entry ${brainEntry.id}`);

  return {
    newSummary: brainEntry.summary, // Placeholder - actual update happens when chat completes
  };
}

// ──────────────────────────────────────────────────────────────
// Trigger Functions (used by server actions)
// ──────────────────────────────────────────────────────────────

export async function triggerBrainIngestion(workspaceId: string): Promise<{
  processed: number;
  chatId: string;
  message: string;
}> {
  const unprocessedLogs = await getUnprocessedActivityLogs(workspaceId, 50);

  if (unprocessedLogs.length === 0) {
    return { processed: 0, chatId: "", message: "No unprocessed activity logs found" };
  }

  const userId = await getWorkspaceOwnerId(workspaceId);
  if (!userId) {
    throw new Error("Could not find workspace owner");
  }

  const chat = await createAiChat({ workspaceId, userId }, "orchestrator");

  const logsDescription = unprocessedLogs
    .map((log, i) => `--- Activity ${i + 1} ---
Type: ${log.recordType}
Operation: ${log.operation}
Record ID: ${log.recordId ?? "N/A"}
Timestamp: ${log.createdAt.toISOString()}
Old Data: ${JSON.stringify(log.oldData ?? {}, null, 2)}
New Data: ${JSON.stringify(log.newData ?? {}, null, 2)}`)
    .join("\n\n");

  const prompt = `You are a workspace memory manager. Analyze the following activity logs and create memory entries for important facts/events using the manage_brain tool with action=create.

Focus on:
- Actionable insights (what happened that matters for future decisions)
- Key changes and their implications
- Important facts about workflows, pieces, runs, and credentials
- Avoid trivial operations or redundant entries

Activity Logs:
${logsDescription}

For each significant fact or event you identify, call manage_brain with action=create and appropriate summary, type, category, recordType, recordId, and tags.

After creating all relevant entries, respond with a brief summary of what you created.`;

  await appendUserMessageAndMarkPending({ chatId: chat.id, content: prompt });

  await enqueueChatExecution({ chatId: chat.id, workspaceId, userId });

  const processedIds = unprocessedLogs.map((log) => log.id);
  await markActivityLogsProcessed(processedIds);

  return {
    processed: unprocessedLogs.length,
    chatId: chat.id,
    message: `Created AI chat ${chat.id} to process ${unprocessedLogs.length} activity logs`,
  };
}

export async function triggerBrainReinforcement(workspaceId: string): Promise<{
  processed: number;
  chatId: string;
  message: string;
}> {
  const unreinforcedEntries = await getUnreinforcedBrainEntries(workspaceId, 50);

  if (unreinforcedEntries.length === 0) {
    return { processed: 0, chatId: "", message: "No unreinforced brain entries found" };
  }

  const userId = await getWorkspaceOwnerId(workspaceId);
  if (!userId) {
    throw new Error("Could not find workspace owner");
  }

  const chat = await createAiChat({ workspaceId, userId }, "orchestrator");

  const entriesDescription = unreinforcedEntries
    .map((entry, i) => `--- Memory ${i + 1} ---
ID: ${entry.id}
Type: ${entry.type}
Category: ${entry.category}
Summary: ${entry.summary}
Confidence: ${entry.confidence}
Reinforcement Count: ${entry.reinforcementCount}
Tags: ${entry.tags?.join(", ") ?? "none"}
Created: ${entry.createdAt.toISOString()}`)
    .join("\n\n");

  const prompt = `You are a workspace memory manager. Your job is to review and reinforce the brain's memory entries.

The following entries need to be reviewed (system will automatically mark them as reinforced after this process):

${entriesDescription}

Use the manage_brain tool to:
1. Search for similar entries (action=search) to find duplicates or contradictions
2. Get specific entries (action=get) for details
3. Update stale/wrong entries (action=update) with corrected summaries
4. Delete redundant or inaccurate entries (action=delete)

Look for:
- Stale entries: outdated or no longer relevant memories
- Contradictory entries: memories that conflict with each other
- Redundant entries: duplicates of the same fact
- Inaccurate entries: memories that appear wrong

Use the tools freely to investigate and clean up the brain. Respond with a summary of what you found and fixed.`;

  await appendUserMessageAndMarkPending({ chatId: chat.id, content: prompt });

  await enqueueChatExecution({ chatId: chat.id, workspaceId, userId });

  // Mark all unreinforced entries as reenforced
  const entryIds = unreinforcedEntries.map((e) => e.id);
  await markBrainEntriesReenforced(entryIds);

  return {
    processed: unreinforcedEntries.length,
    chatId: chat.id,
    message: `Created AI chat ${chat.id} to reinforce ${unreinforcedEntries.length} entries`,
  };
}

// ──────────────────────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────────────────────

export async function getUnreinforcedBrainEntries(
  workspaceId: string,
  limit: number = 10
): Promise<Brain[]> {
  if (!isValidUuid(workspaceId)) return [];

  return db
    .select()
    .from(brain)
    .where(and(eq(brain.workspaceId, workspaceId), eq(brain.isReenforced, false)))
    .orderBy(asc(brain.createdAt))
    .limit(limit);
}

export async function markBrainEntriesReenforced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  await db
    .update(brain)
    .set({ isReenforced: true, updatedAt: new Date() })
    .where(inArray(brain.id, ids));
}

export async function getBrainStats(workspaceId: string): Promise<{
  totalEntries: number;
  factsCount: number;
  episodesCount: number;
  averageConfidence: number;
  categoryBreakdown: Record<string, number>;
}> {
  if (!isValidUuid(workspaceId)) {
    return { totalEntries: 0, factsCount: 0, episodesCount: 0, averageConfidence: 0, categoryBreakdown: {} };
  }

  const entries = await db
    .select()
    .from(brain)
    .where(eq(brain.workspaceId, workspaceId));

  const totalEntries = entries.length;
  const factsCount = entries.filter((e) => e.type === "fact").length;
  const episodesCount = entries.filter((e) => e.type === "episode").length;
  const averageConfidence = totalEntries > 0
    ? entries.reduce((sum, e) => sum + e.confidence, 0) / totalEntries
    : 0;

  const categoryBreakdown: Record<string, number> = {};
  for (const entry of entries) {
    categoryBreakdown[entry.category] = (categoryBreakdown[entry.category] ?? 0) + 1;
  }

  return { totalEntries, factsCount, episodesCount, averageConfidence, categoryBreakdown };
}
