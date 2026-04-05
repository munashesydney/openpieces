import { DashboardLayout } from "../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../components/layout/main-area";
import { OverviewPersonalView } from "../../../../components/overview/overview-personal-view";
import { requireWorkspaceOwner } from "../../../../lib/services/auth.service";
import { getAiChatsForWorkspace, getAiMessages } from "../../../../lib/services/chat.service";
import { sendAiMessageAction } from "./actions";

export default async function Home(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  const pageSize = 10;

  const { user } = await requireWorkspaceOwner(workspaceId);
  const { data: initialChats, total: initialTotal } = await getAiChatsForWorkspace(workspaceId, user.id, 1, pageSize);
  const initialSelectedChatId = null;
  const initialMessages = initialSelectedChatId
    ? { [initialSelectedChatId]: await getAiMessages(initialSelectedChatId) }
    : {};

  const sendMessage = sendAiMessageAction.bind(null, workspaceId);

  return (
    <DashboardLayout>
      <MainArea>
        <OverviewPersonalView
          workspaceId={workspaceId}
          initialChats={initialChats}
          initialSelectedChatId={initialSelectedChatId}
          initialMessages={initialMessages}
          initialTotal={initialTotal}
          sendMessageAction={sendMessage}
        />
      </MainArea>
    </DashboardLayout>
  );
}