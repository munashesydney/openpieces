import { NextResponse } from "next/server";
import { getBrainEntriesForReinforcement } from "@/lib/services/brain.service";
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

    const entries = await getBrainEntriesForReinforcement(workspaceId, 10);

    if (entries.length === 0) {
      return NextResponse.json({
        reinforced: 0,
        message: "No entries need reinforcement",
      });
    }

    const userId = await getWorkspaceOwnerId(workspaceId);
    if (!userId) {
      return NextResponse.json({ error: "Could not find workspace owner" }, { status: 400 });
    }

    const chatIds: string[] = [];
    for (const entry of entries) {
      try {
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

        chatIds.push(chat.id);
      } catch (error) {
        console.error(`[brain] Failed to create reinforcement chat for entry ${entry.id}:`, error);
      }
    }

    return NextResponse.json({
      reinforced: chatIds.length,
      chatIds,
      message: `Created ${chatIds.length} AI chats to reinforce brain entries`,
    });
  } catch (error) {
    console.error("Failed to trigger brain reinforcement:", error);
    return NextResponse.json({ error: "Failed to trigger reinforcement" }, { status: 500 });
  }
}
