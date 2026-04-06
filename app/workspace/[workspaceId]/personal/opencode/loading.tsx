import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { OpenCodePageSkeleton } from "@/components/opencode/opencode-page-skeleton";

export default function OpenCodeLoading() {
  return (
    <DashboardLayout>
      <MainArea>
        <div className="flex h-full flex-col bg-[var(--background)]">
          <div className="border-b border-[var(--border)] p-6">
            <div className="h-8 w-56 max-w-[80%] rounded-md bg-[var(--hover-bg)] animate-pulse" />
            <div className="mt-2 h-4 w-[min(100%,28rem)] rounded-md bg-[var(--hover-bg)] animate-pulse" />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <OpenCodePageSkeleton />
          </div>
        </div>
      </MainArea>
    </DashboardLayout>
  );
}
