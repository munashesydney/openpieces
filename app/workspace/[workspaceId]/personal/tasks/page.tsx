import { DashboardLayout } from "../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../components/layout/main-area";
import { TasksList } from "../../../../../components/tasks/tasks-list";
import { getTasks } from "../../../../../lib/services/task.service";

export default async function TasksPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const params = await props.params;
  const tasks = await getTasks(params.workspaceId);

  return (
    <DashboardLayout>
      <MainArea>
        <TasksList initialTasks={tasks} workspaceId={params.workspaceId} />
      </MainArea>
    </DashboardLayout>
  );
}
