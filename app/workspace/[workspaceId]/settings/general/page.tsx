import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { GeneralSettings } from "../../../../../components/settings/general-settings";

export default async function GeneralSettingsPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  const { workspace } = await requireWorkspaceOwner(workspaceId);

  return (
    <GeneralSettings
      workspaceId={workspaceId}
      initialName={workspace.name}
      initialDescription={workspace.description ?? ""}
    />
  );
}