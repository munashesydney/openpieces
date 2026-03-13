import { DashboardLayout } from "../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../components/layout/main-area";
import { TasksList } from "../../../../../components/tasks/tasks-list";

export default function TasksPage() {
  return (
    <DashboardLayout>
      <MainArea>
        <TasksList />
      </MainArea>
    </DashboardLayout>
  );
}
