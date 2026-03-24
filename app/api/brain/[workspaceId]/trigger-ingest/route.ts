import { NextResponse } from "next/server";
import {
  getUnprocessedActivityLogs,
  markActivityLogsProcessed,
} from "@/lib/services/brain.service";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { createAiChat, appendUserMessageAndMarkPending } from "@/lib/services/chat.service";
import { enqueueChatExecution } from "@/lib/queues/pg-boss";
import { getWorkspaceOwnerId } from "@/lib/services/workspace.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    await requireWorkspaceOwner(workspaceId);

    const unprocessedLogs = await getUnprocessedActivityLogs(workspaceId, 50);

    if (unprocessedLogs.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: "No unprocessed activity logs found",
      });
    }

    // Bundle ALL logs into ONE AI chat for intelligent processing
    const userId = await getWorkspaceOwnerId(workspaceId);
    if (!userId) {
      return NextResponse.json({ error: "Could not find workspace owner" }, { status: 400 });
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

    return NextResponse.json({
      processed: unprocessedLogs.length,
      chatId: chat.id,
      message: `Created AI chat ${chat.id} to process ${unprocessedLogs.length} activity logs`,
    });
  } catch (error) {
    console.error("Failed to trigger brain ingestion:", error);
    return NextResponse.json({ error: "Failed to trigger ingestion" }, { status: 500 });
  }
}
