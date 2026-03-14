import { DashboardLayout } from "../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../components/layout/main-area";
import { ServicesList } from "../../../../../components/services/services-list";
import { getServices } from "../../../../../lib/services/service.service";
import { getWorkflows } from "../../../../../lib/services/workflow.service";

export default async function ServicesPage(props: {
  params: Promise<{ workspaceId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const page = searchParams?.page ? parseInt(searchParams.page as string, 10) : 1;
  const pageSize = 10;

  const [{ data: services, total }, { data: workflows }] = await Promise.all([
    getServices(params.workspaceId, page, pageSize),
    getWorkflows(params.workspaceId, 1, 100),
  ]);

  return (
    <DashboardLayout>
      <MainArea>
        <ServicesList
          initialServices={services}
          workspaceId={params.workspaceId}
          total={total}
          currentPage={page}
          pageSize={pageSize}
          workflows={workflows}
        />
      </MainArea>
    </DashboardLayout>
  );
}
