import { DashboardLayout } from "../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../components/layout/main-area";
import { ServicesList } from "../../../../../components/services/services-list";
import { getServices } from "../../../../../lib/services/service.service";

export default async function ServicesPage(props: {
  params: Promise<{ workspaceId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const page = searchParams?.page ? parseInt(searchParams.page as string, 10) : 1;
  const pageSize = 10;
  
  const { data: services, total } = await getServices(params.workspaceId, page, pageSize);

  return (
    <DashboardLayout>
      <MainArea>
        <ServicesList 
          initialServices={services} 
          workspaceId={params.workspaceId} 
          total={total}
          currentPage={page}
          pageSize={pageSize}
        />
      </MainArea>
    </DashboardLayout>
  );
}
