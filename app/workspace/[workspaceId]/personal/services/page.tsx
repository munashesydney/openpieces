import { DashboardLayout } from "../../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../../components/layout/main-area";
import { ServicesTitle } from "../../../../../components/services/services-title";
import { ServicesList } from "../../../../../components/services/services-list";

export default function ServicesPage() {
  return (
    <DashboardLayout>
      <MainArea>
        <ServicesTitle />
        <ServicesList />
      </MainArea>
    </DashboardLayout>
  );
}
