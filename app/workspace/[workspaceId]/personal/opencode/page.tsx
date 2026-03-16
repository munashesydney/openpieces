import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { OpenCodePage } from "@/components/opencode/opencode-page";
import { getServices } from "@/lib/services/service.service";

export default async function OpenCodePageRoute(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  const { data: services } = await getServices(workspaceId, 1, 100);

  return (
    <DashboardLayout>
      <MainArea>
        <div className="flex flex-col h-full bg-[var(--background)]">
          <div className="p-6 border-b border-[var(--border)]">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              OpenCode Integration
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              Manage code generation sessions directly with the OpenCode container
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <OpenCodePage workspaceId={workspaceId} services={services} />
          </div>
        </div>
      </MainArea>
    </DashboardLayout>
  );
}
