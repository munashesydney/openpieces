import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getWorkspaceChatLimitInfo } from "@/lib/services/workspace-settings.service";
import { ChatLimitBanner } from "@/components/layout/chat-limit-banner";
import { resetChatLimitAction } from "./actions";

export default async function WorkspaceLayout(props: {
  children: React.ReactNode;
  params: Promise<{
    workspaceId: string;
  }>;
}) {
  const { workspaceId } = await props.params;
  await requireWorkspaceOwner(workspaceId);

  const { used, limit, isOverLimit } =
    await getWorkspaceChatLimitInfo(workspaceId);

  return (
    <>
      {isOverLimit && (
        <ChatLimitBanner
          isOverLimit={isOverLimit}
          used={used}
          limit={limit}
          onReset={resetChatLimitAction.bind(null, workspaceId)}
        />
      )}
      {props.children}
    </>
  );
}
