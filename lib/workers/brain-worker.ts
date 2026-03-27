import { getPgBoss, BRAIN_QUEUE, enqueueChatExecution } from "@/lib/queues/pg-boss";
import {
  getOrCreateBrainSettings,
  getUnprocessedActivityLogs,
  markActivityLogsProcessed,
  updateLastIngestionRun,
  updateLastReinforcementRun,
  getUnreinforcedBrainEntries,
  markBrainEntriesReenforced,
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

async function pollForMaintenance(workspaceId: string) {
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

    // Get unreinforced brain entries for this workspace
    const unreinforcedEntries = await getUnreinforcedBrainEntries(workspaceId, 50);

    if (unreinforcedEntries.length === 0) {
      return; // Nothing to reinforce
    }

    const userId = await getWorkspaceOwnerId(workspaceId);
    if (!userId) {
      console.error(`[brain-worker] Could not find owner for workspace ${workspaceId}`);
      return;
    }

    // ONE chat - AI fetches and cleans up using manage_brain tools
    const chat = await createAiChat({ workspaceId, userId });

    // Format unreinforced entries into the prompt
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

The following entries need to be reviewed and reinforced:

${entriesDescription}

Use the manage_brain tool to:
1. List entries (action=list) to see all memories
2. Search for similar entries (action=search) to find duplicates or contradictions
3. Get specific entries (action=get) for details
4. Update stale/wrong entries (action=update) with corrected summaries
5. Delete redundant or inaccurate entries (action=delete)

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

    // Update last reinforcement run
    await updateLastReinforcementRun(workspaceId);

    console.log(`[brain-worker] Maintenance complete: created chat ${chat.id} for ${unreinforcedEntries.length} entries`);
  } catch (error) {
    console.error(`[brain-worker] Maintenance error for workspace ${workspaceId}:`, error);
  }
}

async function processAllWorkspaces() {
  try {
    // Get all workspaces
    const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);

    for (const workspace of allWorkspaces) {
      await pollForIngestion(workspace.id);
      await pollForMaintenance(workspace.id);
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
      await pollForMaintenance(data.workspaceId);
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
