import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { WorkflowDetail } from "@/components/workflows/workflow-detail";
import { getWorkflowById } from "@/lib/services/workflow.service";
import { getServicesByWorkflowId } from "@/lib/services/service.service";
import { getTasksByWorkflowId } from "@/lib/services/task.service";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; workflowId: string }>;
}) {
  const { workspaceId, workflowId } = await params;

  const [workflow, services, tasks] = await Promise.all([
    getWorkflowById(workflowId, workspaceId),
    getServicesByWorkflowId(workflowId, workspaceId),
    getTasksByWorkflowId(workflowId, workspaceId),
  ]);

  if (!workflow) notFound();

  return (
    <DashboardLayout>
      <MainArea>
        <WorkflowDetail
          workflow={workflow}
          workspaceId={workspaceId}
          services={services}
          tasks={tasks}
        />
      </MainArea>
    </DashboardLayout>
  );
}
