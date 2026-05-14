import { DashboardLayout } from "../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../components/layout/main-area";
import { OverviewPersonalView } from "../../../../components/overview/overview-personal-view";
import { requireWorkspaceOwner } from "../../../../lib/services/auth.service";
import {
  getAiChatsForWorkspace,
  getAiMessages,
} from "../../../../lib/services/chat.service";
import { getWorkspaceSettings } from "../../../../lib/services/workspace-settings.service";
import {
  sendAiMessageAction,
  updateWorkspaceModelAction,
  updateChatModelAction,
} from "./actions";

export default async function Home(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
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
  const initialSelectedChatId = null;
  const initialMessages = initialSelectedChatId
    ? { [initialSelectedChatId]: await getAiMessages(initialSelectedChatId) }
    : {};

  const settings = await getWorkspaceSettings(workspaceId);
  const initialWorkspaceModel =
    settings?.defaultModel ?? "deepseek/deepseek-v3.2";

  const sendMessage = sendAiMessageAction.bind(null, workspaceId);
  const updateWorkspaceModel = updateWorkspaceModelAction.bind(
    null,
    workspaceId,
  );
  const updateChatModel = updateChatModelAction.bind(null, workspaceId);

  return (
    <DashboardLayout>
      <MainArea className="dot-grid">
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
        />
      </MainArea>
    </DashboardLayout>
  );
}
