import { DashboardLayout } from "../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../components/layout/main-area";
import { ServicesTitle } from "../../../../../components/services/services-title";
import { ServicesList } from "../../../../../components/services/services-list";

export default function ServicesPage() {
  return (
    <DashboardLayout>
      <MainArea>
        <ServicesTitle />
        <div className="flex items-center justify-center px-6">
          <div className="mt-10 h-px w-full max-w-[920px] bg-[var(--border)]" />
        </div>
        <ServicesList />
      </MainArea>
    </DashboardLayout>
  );
}
