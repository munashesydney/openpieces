"use client";

export function GeneralSettings() {
  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Workspace Identity</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage how your workspace is identified and accessed.</p>
          
          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Workspace Name</label>
              <input
                type="text"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                placeholder="e.g. Acme Corporation"
                defaultValue="My Project"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Workspace URL</label>
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden">
                <span className="flex items-center bg-[var(--hover-bg)] px-4 text-sm text-[var(--muted)] border-r border-[var(--border)]">
                  app.openpieces.com/
                </span>
                <input
                  type="text"
                  className="flex-1 px-4 py-2.5 text-sm text-[var(--foreground)] bg-transparent focus:outline-none"
                  placeholder="workspace-slug"
                  defaultValue="my-project"
                />
              </div>
              <p className="text-xs text-[var(--muted)]">This is your persistent workspace identifier.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm transition-all hover:border-red-500/30">
          <h2 className="text-xl font-semibold text-red-500">Danger Zone</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Irreversible and destructive actions for this workspace.</p>
          
          <div className="mt-8">
            <button className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-white">
              Delete Workspace
            </button>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button className="px-5 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            Cancel
          </button>
          <button className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white shadow-[0_10px_25px_var(--accent-glow)] transition-opacity hover:opacity-90">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
