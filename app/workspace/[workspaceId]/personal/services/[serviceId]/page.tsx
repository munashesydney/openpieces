import { notFound } from "next/navigation";
import { DashboardLayout } from "../../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../../components/layout/main-area";
import { ServiceDetail } from "../../../../../../components/services/service-detail";
import { getServiceById } from "../../../../../../lib/services/service.service";
import { getEndpointsByServiceId } from "../../../../../../lib/services/service-endpoint.service";
import { getRequiredSecrets } from "../../../../../../lib/services/service-required-secrets.service";
import { getSecrets } from "../../../../../../lib/services/secret.service";
import { auth } from "@/auth";

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

  const [endpoints, requiredSecrets] = await Promise.all([
    getEndpointsByServiceId(serviceId, workspaceId),
    getRequiredSecrets(serviceId),
  ]);

  const session = await auth();
  const userId = session?.user?.id;
  let workspaceSecrets: { key: string; id: string }[] = [];
  if (userId) {
    const { data } = await getSecrets(workspaceId, userId, 1, 100);
    workspaceSecrets = data.map(s => ({ key: s.key, id: s.id }));
  }

  return (
    <DashboardLayout>
      <MainArea>
        <ServiceDetail 
          service={service} 
          endpoints={endpoints} 
          requiredSecrets={requiredSecrets}
          workspaceSecrets={workspaceSecrets}
          workspaceId={workspaceId} 
        />
      </MainArea>
    </DashboardLayout>
  );
}
