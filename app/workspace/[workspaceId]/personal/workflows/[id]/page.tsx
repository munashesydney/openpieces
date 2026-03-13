import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { WorkflowDetail } from "@/components/workflows/workflow-detail";

export default function WorkflowDetailPage() {
  return (
    <DashboardLayout>
      <MainArea>
        <WorkflowDetail />
      </MainArea>
    </DashboardLayout>
  );
}
