/** Skeleton layout for the Usage page: header + metric cards + cost bars + records table */
export function UsageSkeleton() {
  return (
    <div className="flex w-full px-6 pb-20 pt-8 animate-pulse">
      <div className="w-full px-4 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded-md bg-[var(--hover-bg)]" />
            <div className="h-7 w-24 rounded-md bg-[var(--hover-bg)]" />
            <div className="h-4 w-72 rounded-md bg-[var(--hover-bg)]" />
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className="h-9 w-64 rounded-md bg-[var(--hover-bg)]" />
            <div className="h-9 w-24 rounded-md bg-[var(--hover-bg)]" />
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)] p-5 space-y-3"
            >
              <div className="h-3.5 w-20 rounded-md bg-[var(--hover-bg)]" />
              <div className="flex items-baseline gap-2">
                <div className="h-8 w-28 rounded-md bg-[var(--hover-bg)]" />
                <div className="h-3 w-16 rounded-md bg-[var(--hover-bg)]" />
              </div>
            </div>
          ))}
        </div>

        {/* Cost by Agent */}
        <div className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)] p-5 space-y-4">
          <div className="h-4 w-28 rounded-md bg-[var(--hover-bg)]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 w-24 rounded-md bg-[var(--hover-bg)]" />
                <div className="h-3.5 w-20 rounded-md bg-[var(--hover-bg)]" />
              </div>
              <div className="h-1.5 w-full rounded bg-[var(--hover-bg)]" />
            </div>
          ))}
        </div>

        {/* Recent Usage Records */}
        <div className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <div className="h-4 w-36 rounded-md bg-[var(--hover-bg)]" />
          </div>
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-24 rounded-md bg-[var(--hover-bg)]" />
                    <div className="h-3.5 w-12 rounded-md bg-[var(--hover-bg)]" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-3 w-32 rounded-md bg-[var(--hover-bg)]" />
                    <div className="h-3 w-40 rounded-md bg-[var(--hover-bg)]" />
                  </div>
                </div>
                <div className="h-4 w-20 rounded-md bg-[var(--hover-bg)]" />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2">
          <div className="h-4 w-32 rounded-md bg-[var(--hover-bg)]" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-[var(--hover-bg)]" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 w-8 rounded-md bg-[var(--hover-bg)]" />
            ))}
            <div className="h-8 w-8 rounded-md bg-[var(--hover-bg)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
