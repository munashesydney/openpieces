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
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded border border-[var(--accent)]/15 bg-[var(--accent)]/10 text-[var(--accent)]">
          {icon}
        </div>
        <div>
          <p className="text-[13px] text-[var(--muted)]">{label}</p>
          <p className="text-2xl font-semibold text-[var(--foreground)]">{value}</p>
        </div>
      </div>
    </Card>
  );
}
