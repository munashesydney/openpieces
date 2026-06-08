import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { WorkflowsList } from "@/components/workflows/workflows-list";
import { getWorkflows } from "@/lib/services/workflow.service";

export default async function WorkflowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ ordId: string; workspaceId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { workspaceId, ordId } = await params;
  const resolvedSearch = await searchParams;
  const currentPage = Number(resolvedSearch?.page ?? 1);
  const pageSize = 10;

  const { data: workflows, total } = await getWorkflows(
    workspaceId,
    currentPage,
    pageSize,
  );

  return (
    <DashboardLayout>
      <MainArea>
        <WorkflowsList
          initialWorkflows={workflows}
          workspaceId={workspaceId}
          orgId={ordId}
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
        />
      </MainArea>
    </DashboardLayout>
  );
}
