import { DashboardLayout } from "../../../../components/layout/dashboard-layout";
import { MainArea } from "../../../../components/layout/main-area";
import { SettingsTitle } from "../../../../components/settings/settings-title";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      <MainArea>
        <SettingsTitle />
        <div className="flex-1 overflow-auto">{children}</div>
      </MainArea>
    </DashboardLayout>
  );
}
