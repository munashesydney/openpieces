import { Settings } from "lucide-react";
import { Button } from "../basic/buttons/button";

export function BrainHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Brain</h1>
        <p className="text-sm text-[var(--muted)]">
          Your memory graph for conversations, facts, and reinforced context
        </p>
      </div>
      <Button
        variant="primary"
        size="md"
        onClick={onOpenSettings}
        className="rounded-full"
      >
        <Settings className="h-4 w-4" />
        Settings
      </Button>
    </div>
  );
}
