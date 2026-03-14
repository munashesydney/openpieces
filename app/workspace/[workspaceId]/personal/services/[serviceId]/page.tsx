import { notFound } from "next/navigation";
import { DashboardLayout } from "../../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../../components/layout/main-area";
import { ServiceDetail } from "../../../../../../components/services/service-detail";
import { getServiceById } from "../../../../../../lib/services/service.service";
import { getEndpointsByServiceId } from "../../../../../../lib/services/service-endpoint.service";

interface PageProps {
  params: Promise<{
    workspaceId: string;
    serviceId: string;
  }>;
}

export default async function ServiceIdPage({ params }: PageProps) {
  const { workspaceId, serviceId } = await params;

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) {
    notFound();
  }

  const endpoints = await getEndpointsByServiceId(serviceId);

  return (
    <DashboardLayout>
      <MainArea>
        <ServiceDetail service={service} endpoints={endpoints} workspaceId={workspaceId} />
      </MainArea>
    </DashboardLayout>
  );
}
