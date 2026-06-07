import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getWorkspaceSettings } from "@/lib/services/workspace-settings.service";
import { GeneralSettings } from "@/components/settings/general-settings";

export default async function SettingsPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const settings = await getWorkspaceSettings(workspaceId);

  return (
    <GeneralSettings
      workspaceId={workspaceId}
      initialName={workspace.name}
      initialDescription={workspace.description ?? ""}
      initialTimezone={settings?.timezone ?? "UTC"}
    />
  );
}
