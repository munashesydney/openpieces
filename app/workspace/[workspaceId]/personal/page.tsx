import { DashboardLayout } from "../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../components/layout/main-area";
import { OverviewPersonalView } from "../../../../components/overview/overview-personal-view";

export default function Home() {
  return (
    <DashboardLayout>
      <MainArea>
        <OverviewPersonalView />
      </MainArea>
    </DashboardLayout>
  );
}
