import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { AgentSettings } from "./agent-settings";

export default async function AgentSettingsPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  const { workspace } = await requireWorkspaceOwner(workspaceId);

  return (
    <AgentSettings
      workspaceId={workspaceId}
      initialAgentName={workspace.agentName ?? "Assistant"}
      initialUserNickname={workspace.userNickname ?? "User"}
    />
  );
}
