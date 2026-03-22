import { DashboardLayout } from "../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../components/layout/main-area";

export default async function BrainLayout(props: {
  children: React.ReactNode;
  params: Promise<{
    workspaceId: string;
  }>;
}) {
  return (
    <DashboardLayout>
      <MainArea>{props.children}</MainArea>
    </DashboardLayout>
  );
}
