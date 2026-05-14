import { Settings } from "lucide-react";
import { Button } from "../basic/buttons/button";

export function BrainHeader({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">Memory</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Brain
        </h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Your memory graph for conversations, facts, and reinforced context
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenSettings}
      >
        <Settings className="h-3.5 w-3.5" />
        Settings
      </Button>
    </div>
  );
}
