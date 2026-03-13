import { DashboardLayout } from "../../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../../components/layout/main-area";
import { ServiceDetail } from "../../../../../../components/services/service-detail";

interface PageProps {
  params: Promise<{
    workspaceId: string;
    serviceId: string;
  }>;
}

export default async function ServiceIdPage({ params }: PageProps) {
  const { workspaceId, serviceId } = await params;

  return (
    <DashboardLayout>
      <MainArea>
        <ServiceDetail id={serviceId} workspaceId={workspaceId} />
      </MainArea>
    </DashboardLayout>
  );
}
