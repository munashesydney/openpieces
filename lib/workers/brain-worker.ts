import {
  getPgBoss,
  BRAIN_QUEUE,
  PG_BOSS_CONCURRENCY,
} from "@/lib/queues/pg-boss";
import {
  getOrCreateBrainSettings,
  triggerBrainIngestion,
  triggerBrainReinforcement,
} from "@/lib/services/brain.service";
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

    const result = await triggerBrainIngestion(workspaceId);

    if (result.processed > 0) {
      console.log(`[brain-worker] Ingestion complete: ${result.message}`);
    }
  } catch (error) {
    console.error(
      `[brain-worker] Ingestion error for workspace ${workspaceId}:`,
      error,
    );
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

    const result = await triggerBrainReinforcement(workspaceId);

    if (result.processed > 0) {
      console.log(`[brain-worker] Reinforcement complete: ${result.message}`);
    }
  } catch (error) {
    console.error(
      `[brain-worker] Reinforcement error for workspace ${workspaceId}:`,
      error,
    );
  }
}

async function processAllWorkspaces() {
  try {
    // Get all workspaces
    const allWorkspaces = await db
      .select({ id: workspaces.id })
      .from(workspaces);

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
  await boss.work(
    BRAIN_QUEUE,
    { localConcurrency: PG_BOSS_CONCURRENCY },
    async (jobs) => {
      const job = jobs[0];
      if (!job) {
        return;
      }

      const data = job.data as {
        workspaceId: string;
        action: "ingest" | "reinforce";
      };
      console.log(
        `[brain-worker] Received brain job: ${data.action} for workspace ${data.workspaceId}`,
      );

      if (data.action === "ingest") {
        await pollForIngestion(data.workspaceId);
      } else if (data.action === "reinforce") {
        await pollForReinforcement(data.workspaceId);
      }
    },
  );

  // Poll every 5 minutes
  const POLL_INTERVAL_MS = 5 * 60 * 1000;
  console.log(
    `[brain-worker] Starting brain polling every ${POLL_INTERVAL_MS / 1000 / 60} minutes`,
  );

  // Run immediately on start
  await processAllWorkspaces();

  // Then poll periodically
  setInterval(processAllWorkspaces, POLL_INTERVAL_MS);

  return boss;
}
