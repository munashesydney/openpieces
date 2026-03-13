import { DashboardLayout } from "../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../components/layout/main-area";
import { OverviewComposer } from "../../../../components/overview/overview-composer";
import { OverviewTitle } from "../../../../components/overview/overview-title";

export default function Home() {
  return (
    <DashboardLayout>
      <MainArea>
        <OverviewTitle />
        <div className="flex items-center justify-center px-6">
          <div className="mt-10 h-px w-full max-w-[920px] bg-[var(--border)]" />
        </div>
        <OverviewComposer />
      </MainArea>
    </DashboardLayout>
  );
}
