import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getApiKeys } from "@/lib/services/api-key.service";
import { ApiKeysClient } from "./client";

export default async function ApiSettingsPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  const { user } = await requireWorkspaceOwner(workspaceId);
  const keys = await getApiKeys(workspaceId, user.id);

  return <ApiKeysClient initialKeys={keys} workspaceId={workspaceId} />;
}
