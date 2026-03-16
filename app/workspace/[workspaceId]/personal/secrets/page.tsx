import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { SecretsPage } from "@/components/secrets/secrets-page";

export default async function SecretsRoute(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;

  // workspaceId is resolved to align with other personal routes,
  // but this page is UI-only for now and does not yet persist data.

  return (
    <DashboardLayout>
      <MainArea>
        <SecretsPage />
      </MainArea>
    </DashboardLayout>
  );
}

