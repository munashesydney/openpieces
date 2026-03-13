"use client";

export function ServicesTitle() {
  return (
    <div className="px-10 pt-10 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-semibold tracking-wide text-[var(--foreground)]">
        Services
      </h1>
      <p className="mt-2 text-lg text-[var(--muted)]">
        Manage and explore available services.
      </p>
    </div>
  );
}
