import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { SecretsPage } from "@/components/secrets/secrets-page";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getSecrets } from "@/lib/services/secret.service";

export default async function SecretsRoute(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  const { user } = await requireWorkspaceOwner(workspaceId);
  const { data: secrets } = await getSecrets(workspaceId, user.id);

  return (
    <DashboardLayout>
      <MainArea>
        <SecretsPage initialSecrets={secrets} workspaceId={workspaceId} />
      </MainArea>
    </DashboardLayout>
  );
}

