import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { WorkflowExecutionsList } from "@/components/workflows/workflow-executions-list";
import { getWorkflowExecutions } from "@/lib/services/workflow-execution.service";
import { getWorkflowById } from "@/lib/services/workflow.service";

export default async function WorkflowExecutionsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; workflowId: string }>;
}) {
  const { workspaceId, workflowId } = await params;

  const [workflow, executions] = await Promise.all([
    getWorkflowById(workflowId, workspaceId),
    getWorkflowExecutions(workflowId, workspaceId),
  ]);

  if (!workflow) notFound();

  return (
    <DashboardLayout>
      <MainArea>
        <WorkflowExecutionsList
          executions={executions}
          workflowId={workflowId}
          workspaceId={workspaceId}
        />
      </MainArea>
    </DashboardLayout>
  );
}
