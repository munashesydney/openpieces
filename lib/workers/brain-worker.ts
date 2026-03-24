import { getPgBoss, BRAIN_QUEUE, enqueueChatExecution } from "@/lib/queues/pg-boss";
import {
  getOrCreateBrainSettings,
  getUnprocessedActivityLogs,
  markActivityLogsProcessed,
  getBrainEntriesForReinforcement,
  updateLastIngestionRun,
  updateLastReinforcementRun,
} from "@/lib/services/brain.service";
import { createAiChat, appendUserMessageAndMarkPending } from "@/lib/services/chat.service";
import { getWorkspaceOwnerId } from "@/lib/services/workspace.service";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";

let boss: Awaited<ReturnType<typeof getPgBoss>> | undefined;

async function pollForIngestion(workspaceId: string) {
  try {
    const settings = await getOrCreateBrainSettings(workspaceId);

    if (!settings.ingestionEnabled) {
      return;
    }

    // Check if enough time has passed since last ingestion run
    const lastRun = settings.lastIngestionRun;
    const intervalMs = settings.ingestionIntervalMinutes * 60 * 1000;

    if (lastRun && Date.now() - lastRun.getTime() < intervalMs) {
      return; // Not time yet
    }

    // Get unprocessed activity logs
    const unprocessedLogs = await getUnprocessedActivityLogs(workspaceId, 50);

    if (unprocessedLogs.length === 0) {
      return;
    }

    console.log(`[brain-worker] Processing ${unprocessedLogs.length} unprocessed activity logs for workspace ${workspaceId}`);

    // Bundle ALL logs into ONE AI chat for intelligent processing
    const userId = await getWorkspaceOwnerId(workspaceId);
    if (!userId) {
      console.error(`[brain-worker] Could not find owner for workspace ${workspaceId}`);
      return;
    }

    const chat = await createAiChat({ workspaceId, userId });

    // Format all logs into a structured message
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

    // Mark logs as processed optimistically
    const processedIds = unprocessedLogs.map((log) => log.id);
    await markActivityLogsProcessed(processedIds);

    // Update last ingestion run
    await updateLastIngestionRun(workspaceId);

    console.log(`[brain-worker] Ingestion complete: created chat ${chat.id} for ${unprocessedLogs.length} logs`);
  } catch (error) {
    console.error(`[brain-worker] Ingestion error for workspace ${workspaceId}:`, error);
  }
}

async function pollForReinforcement(workspaceId: string) {
  try {
    const settings = await getOrCreateBrainSettings(workspaceId);

    if (!settings.reinforcementEnabled) {
      return;
    }

    // Check if enough time has passed since last reinforcement run
    const lastRun = settings.lastReinforcementRun;
    const intervalMs = settings.reinforcementIntervalHours * 60 * 60 * 1000;

    if (lastRun && Date.now() - lastRun.getTime() < intervalMs) {
      return; // Not time yet
    }

    // Get low-confidence entries for reinforcement
    const entriesToReinforce = await getBrainEntriesForReinforcement(workspaceId, settings.reinforcementBatchSize);

    if (entriesToReinforce.length === 0) {
      return;
    }

    console.log(`[brain-worker] Reinforcing ${entriesToReinforce.length} brain entries for workspace ${workspaceId}`);

    const userId = await getWorkspaceOwnerId(workspaceId);
    if (!userId) {
      console.error(`[brain-worker] Could not find owner for workspace ${workspaceId}`);
      return;
    }

    for (const entry of entriesToReinforce) {
      try {
        // Create AI chat per entry to reaffirm or update the memory
        const chat = await createAiChat({ workspaceId, userId });

        const prompt = `Review the following memory and decide if it should be strengthened, updated, or merged with similar memories.

Memory Entry:
- Type: ${entry.type}
- Category: ${entry.category}
- Summary: ${entry.summary}
- Current Confidence: ${entry.confidence}
- Reinforcement Count: ${entry.reinforcementCount}
${entry.recordType ? `- Related to: ${entry.recordType} (ID: ${entry.recordId})` : ""}

Based on your knowledge of the workspace, should this memory be:
1. Strengthened (reaffirmed as accurate) - call manage_brain with action=update and the same summary
2. Updated (refined with new information) - call manage_brain with action=update and an improved summary
3. Merged with existing memories (if redundant)

Call manage_brain with action=update (using brainEntryId=${entry.id}) with an appropriate summary to reinforce this memory.`;

        await appendUserMessageAndMarkPending({ chatId: chat.id, content: prompt });

        await enqueueChatExecution({ chatId: chat.id, workspaceId, userId });

        console.log(`[brain-worker] Created reinforcement chat ${chat.id} for brain entry ${entry.id}`);
      } catch (error) {
        console.error(`[brain-worker] Failed to create reinforcement chat for brain entry ${entry.id}:`, error);
      }
    }

    // Update last reinforcement run
    await updateLastReinforcementRun(workspaceId);

    console.log(`[brain-worker] Reinforcement complete: ${entriesToReinforce.length} entries reinforced`);
  } catch (error) {
    console.error(`[brain-worker] Reinforcement error for workspace ${workspaceId}:`, error);
  }
}

async function processAllWorkspaces() {
  try {
    // Get all workspaces
    const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);

    for (const workspace of allWorkspaces) {
      await pollForIngestion(workspace.id);
      await pollForReinforcement(workspace.id);
    }
  } catch (error) {
    console.error("[brain-worker] Error processing workspaces:", error);
  }
}

export async function startBrainWorker() {
  boss = await getPgBoss();

  boss.on("error", (error) => {
    console.error("[brain-worker] pg-boss error:", error);
  });

  // Handle brain processing jobs
  await boss.work(BRAIN_QUEUE, async (jobs) => {
    const job = jobs[0];
    if (!job) {
      return;
    }

    const data = job.data as { workspaceId: string; action: "ingest" | "reinforce" };
    console.log(`[brain-worker] Received brain job: ${data.action} for workspace ${data.workspaceId}`);

    if (data.action === "ingest") {
      await pollForIngestion(data.workspaceId);
    } else if (data.action === "reinforce") {
      await pollForReinforcement(data.workspaceId);
    }
  });

  // Poll every 5 minutes
  const POLL_INTERVAL_MS = 5 * 60 * 1000;
  console.log(`[brain-worker] Starting brain polling every ${POLL_INTERVAL_MS / 1000 / 60} minutes`);

  // Run immediately on start
  await processAllWorkspaces();

  // Then poll periodically
  setInterval(processAllWorkspaces, POLL_INTERVAL_MS);

  return boss;
}

async function shutdown(signal: string) {
  console.log(`[brain-worker] received ${signal}, shutting down`);

  if (boss) {
    await boss.stop();
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
