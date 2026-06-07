import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getWorkspaceSettings } from "@/lib/services/workspace-settings.service";
import { AgentSettings } from "./agent-settings";

export default async function AgentSettingsPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const settings = await getWorkspaceSettings(workspaceId);

  return (
    <AgentSettings
      workspaceId={workspaceId}
      initialAgentName={workspace.agentName ?? "Assistant"}
      initialUserNickname={workspace.userNickname ?? "User"}
      initialChatLimit={settings?.dailyChatLimit ?? 100}
    />
  );
}
