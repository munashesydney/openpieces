"use client";

const services = [
  {
    title: "AI Compute",
    description: "High-performance GPU clusters for training and inference.",
  },
  {
    title: "Global CDN",
    description: "Lightning fast content delivery at the edge of the network.",
  },
  {
    title: "Managed DB",
    description: "Scalable, distributed databases with zero maintenance.",
  },
  {
    title: "Real-time Sync",
    description: "Instant data synchronization across all user devices.",
  },
  {
    title: "Security & Auth",
    description: "Enterprise-grade identity management and threat protection.",
  },
  {
    title: "Semantic Search",
    description: "AI-powered search engine for complex natural language queries.",
  },
  {
    title: "Edge Functions",
    description: "Serverless code execution as close to users as possible.",
  },
  {
    title: "Conversational AI",
    description: "Build intelligent chat interfaces with advanced LLMs.",
  },
];

export function ServicesList() {
  return (
    <div className="flex w-full justify-center px-6 pb-14 pt-14">
      <div className="relative w-full max-w-[820px]">
        <div className="grid grid-cols-1 gap-px bg-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] shadow-sm">
          {services.map((service, index) => (
            <div
              key={index}
              className="group relative cursor-pointer bg-[var(--background)] p-6 transition-colors hover:bg-[var(--hover-bg)]"
            >
              <div className="flex flex-1 items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-[var(--foreground)]">
                    {service.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {service.description}
                  </p>
                </div>
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-[var(--accent)] text-sm font-medium">Configure →</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination UI */}
        <div className="mt-8 flex items-center justify-between px-2">
          <div className="text-sm text-[var(--muted)]">
            Showing <span className="font-medium text-[var(--foreground)]">1</span> to <span className="font-medium text-[var(--foreground)]">8</span> of <span className="font-medium text-[var(--foreground)]">24</span> services
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] disabled:opacity-50"
              disabled
            >
              <span className="sr-only">Previous</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex gap-1">
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    page === 1
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
            >
              <span className="sr-only">Next</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Fancy background gradient restored as requested */}
        <div className="pointer-events-none absolute -inset-x-16 -top-14 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15)_0%,transparent_60%)] opacity-50 dark:bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.18)_0%,transparent_60%)]" />
      </div>
    </div>
  );
}
