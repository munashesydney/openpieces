/** Skeleton layout matching OpenCode: sessions sidebar + main chat column */
export function OpenCodePageSkeleton() {
  return (
    <div className="flex h-full min-h-[320px] text-sm animate-pulse">
      <div className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <div className="h-5 w-24 rounded-md bg-[var(--hover-bg)]" />
          <div className="h-7 w-7 rounded-md bg-[var(--hover-bg)]" />
        </div>
        <div className="flex-1 space-y-2 overflow-hidden p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 w-full rounded-md bg-[var(--hover-bg)]" />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-[var(--background)]">
        <div className="border-b border-[var(--border)] px-6 py-2">
          <div className="h-4 w-full max-w-md rounded-md bg-[var(--hover-bg)]" />
        </div>
        <div className="flex-1 space-y-6 overflow-hidden p-6">
          <div className="flex justify-end">
            <div className="h-16 w-[min(72%,320px)] rounded-xl bg-[var(--hover-bg)]" />
          </div>
          <div className="flex justify-start">
            <div className="h-24 w-[min(85%,420px)] rounded-xl bg-[var(--hover-bg)]" />
          </div>
          <div className="flex justify-end">
            <div className="h-12 w-[min(55%,240px)] rounded-xl bg-[var(--hover-bg)]" />
          </div>
        </div>
        <div className="border-t border-[var(--border)] p-4">
          <div className="mx-auto flex max-w-4xl gap-2">
            <div className="h-[52px] flex-1 rounded-xl bg-[var(--hover-bg)]" />
            <div className="h-12 w-12 shrink-0 rounded-xl bg-[var(--hover-bg)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
