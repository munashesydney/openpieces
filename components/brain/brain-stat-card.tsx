import { ReactNode } from "react";
import { Card } from "../ui/card";

export function BrainStatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-transparent bg-[var(--sidebar-bg)]/85 p-5 shadow-sm shadow-black/5 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)]">
          {icon}
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="text-2xl font-semibold text-[var(--foreground)]">{value}</p>
        </div>
      </div>
    </Card>
  );
}
