import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { OpenCodePage } from "@/components/opencode/opencode-page";

export default function OpenCode() {
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
            <OpenCodePage />
          </div>
        </div>
      </MainArea>
    </DashboardLayout>
  );
}
