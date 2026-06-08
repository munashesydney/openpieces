import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { TasksList } from "@/components/tasks/tasks-list";
import { getTasks } from "@/lib/services/task.service";
import { getWorkflows } from "@/lib/services/workflow.service";

export default async function TasksPage(props: {
  params: Promise<{ ordId: string; workspaceId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page ?? 1);
  const pageSize = 10;

  const [{ data: tasks, total }, { data: workflows }] = await Promise.all([
    getTasks(params.workspaceId, currentPage, pageSize),
    getWorkflows(params.workspaceId, 1, 100),
  ]);

  return (
    <DashboardLayout>
      <MainArea>
        <TasksList
          initialTasks={tasks}
          workspaceId={params.workspaceId}
          workflows={workflows}
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
        />
      </MainArea>
    </DashboardLayout>
  );
}
