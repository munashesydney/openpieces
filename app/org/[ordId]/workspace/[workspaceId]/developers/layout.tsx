import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";

export default async function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      <MainArea>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </MainArea>
    </DashboardLayout>
  );
}
