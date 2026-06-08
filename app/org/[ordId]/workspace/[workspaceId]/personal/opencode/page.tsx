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
          <div className="px-6 pt-8 pb-4 border-b border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">Development</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              OpenCode Integration
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
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
