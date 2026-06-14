import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { OverviewPersonalView } from "@/components/overview/overview-personal-view";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import {
  getAiChatsForWorkspace,
  getAiChatById,
  getAiMessages,
} from "@/lib/services/chat.service";
import { getWorkspaceSettings } from "@/lib/services/workspace-settings.service";
import {
  sendAiMessageAction,
  updateWorkspaceModelAction,
  updateChatModelAction,
  deleteChatAction,
  renameChatAction,
} from "./actions";

export default async function Home(props: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ chat?: string }>;
}) {
  const { workspaceId } = await props.params;
  const { chat: chatParam } = await props.searchParams;
  const pageSize = 20;

  const { user } = await requireWorkspaceOwner(workspaceId);
  const { data: initialChats, total: initialTotal } =
    await getAiChatsForWorkspace(
      workspaceId,
      user.id,
      1,
      pageSize,
      "orchestrator",
    );

  // If ?chat=... param is present, load that specific chat
  let initialSelectedChatId: string | null = null;
  let initialMessages: Record<string, any> = {};

  if (chatParam) {
    const linkedChat = await getAiChatById(chatParam, user.id);
    if (linkedChat) {
      initialSelectedChatId = linkedChat.id;
      initialMessages = {
        [linkedChat.id]: await getAiMessages(linkedChat.id),
      };
      // Prepend the linked chat if it's not already in the orchestrator list
      if (!initialChats.find((c) => c.id === linkedChat.id)) {
        initialChats.unshift(linkedChat);
      }
    }
  }

  const settings = await getWorkspaceSettings(workspaceId);
  const initialWorkspaceModel =
    settings?.defaultModel ?? "deepseek/deepseek-v3.2";

  const sendMessage = sendAiMessageAction.bind(null, workspaceId);
  const updateWorkspaceModel = updateWorkspaceModelAction.bind(
    null,
    workspaceId,
  );
  const updateChatModel = updateChatModelAction.bind(null, workspaceId);
  const deleteChat = deleteChatAction.bind(null, workspaceId);
  const renameChat = renameChatAction.bind(null, workspaceId);

  return (
    <DashboardLayout>
      <MainArea>
        {/* Dot background grid */}
        <div className="pointer-events-none fixed inset-0 z-0 dot-grid opacity-40" />
        <div className="relative z-10 h-full">
          <OverviewPersonalView
            workspaceId={workspaceId}
            initialChats={initialChats}
            initialSelectedChatId={initialSelectedChatId}
            initialMessages={initialMessages}
            initialTotal={initialTotal}
            initialWorkspaceModel={initialWorkspaceModel}
            sendMessageAction={sendMessage}
            updateWorkspaceModelAction={updateWorkspaceModel}
            updateChatModelAction={updateChatModel}
            deleteChatAction={deleteChat}
            renameChatAction={renameChat}
          />
        </div>
      </MainArea>
    </DashboardLayout>
  );
}
