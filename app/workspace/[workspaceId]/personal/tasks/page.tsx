import { DashboardLayout } from "../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../components/layout/main-area";
import { TasksList } from "../../../../../components/tasks/tasks-list";
import { getTasks } from "../../../../../lib/services/task.service";
import { getWorkflows } from "../../../../../lib/services/workflow.service";

export default async function TasksPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const params = await props.params;

  const [tasks, { data: workflows }] = await Promise.all([
    getTasks(params.workspaceId),
    getWorkflows(params.workspaceId, 1, 100),
  ]);

  return (
    <DashboardLayout>
      <MainArea>
        <TasksList initialTasks={tasks} workspaceId={params.workspaceId} workflows={workflows} />
      </MainArea>
    </DashboardLayout>
  );
}
