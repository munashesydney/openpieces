"use client";

export function OverviewTitle() {
  return (
    <div className="flex flex-col items-center justify-center px-4 pt-8 text-center sm:px-10 sm:pt-10">
      <h1 className="text-2xl font-semibold tracking-wide text-[var(--foreground)] sm:text-3xl">
        Overview
      </h1>
      <p className="mt-2 text-lg text-[var(--muted)]">
        Your workspace at a glance.
      </p>
    </div>
  );
}

