import { DashboardLayout } from "../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../components/layout/main-area";
import { OverviewPersonalView } from "../../../../components/overview/overview-personal-view";

export default async function Home(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;

  return (
    <DashboardLayout>
      <MainArea>
        <OverviewPersonalView workspaceId={workspaceId} />
      </MainArea>
    </DashboardLayout>
  );
}
