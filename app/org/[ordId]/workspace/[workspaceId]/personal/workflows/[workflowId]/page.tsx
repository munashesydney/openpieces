import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { WorkflowDetail } from "@/components/workflows/workflow-detail";
import { getWorkflowById } from "@/lib/services/workflow.service";
import {
  getServicesByWorkflowId,
  getServices,
} from "@/lib/services/service.service";
import { getTasksByWorkflowId } from "@/lib/services/task.service";
import { getActionServicesForWorkflow } from "@/lib/services/workflow-action.service";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ ordId: string; workspaceId: string; workflowId: string }>;
}) {
  const { workspaceId, workflowId, ordId } = await params;

  const [
    [workflow, triggerServices, tasks, linkedActionServices],
    allServicesResult,
  ] = await Promise.all([
    Promise.all([
      getWorkflowById(workflowId, workspaceId),
      getServicesByWorkflowId(workflowId, workspaceId),
      getTasksByWorkflowId(workflowId, workspaceId),
      getActionServicesForWorkflow(workflowId, workspaceId),
    ]),
    getServices(workspaceId, 1, 1000), // Get all services for linking sheet
  ]);

  if (!workflow) notFound();

  // Filter to get only action services for the linking dropdown
  const availableActionServices = allServicesResult.data.filter(
    (s) => s.type === "action",
  );

  return (
    <DashboardLayout>
      <MainArea>
        <WorkflowDetail
          workflow={workflow}
          workspaceId={workspaceId}
          orgId={ordId}
          triggerServices={triggerServices}
          tasks={tasks}
          linkedActionServices={linkedActionServices}
          availableActionServices={availableActionServices}
        />
      </MainArea>
    </DashboardLayout>
  );
}
