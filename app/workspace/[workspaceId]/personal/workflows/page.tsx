import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { WorkflowsList } from "@/components/workflows/workflows-list";

export default function WorkflowsPage() {
  return (
    <DashboardLayout>
      <MainArea>
        <WorkflowsList />
      </MainArea>
    </DashboardLayout>
  );
}
