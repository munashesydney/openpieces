import { ReactNode } from "react";
import { Play, RefreshCw, Settings } from "lucide-react";
import { Button } from "../basic/buttons/button";
import { Card } from "../ui/card";
import { BrainSettings } from "./brain-types";

function RunRow({
  title,
  description,
  lastRun,
  actionLabel,
  onRun,
  icon,
  disabled,
}: {
  title: string;
  description: string;
  lastRun: Date | null;
  actionLabel: string;
  onRun: () => void;
  icon: ReactNode;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[var(--background)]/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-[var(--foreground)]">{title}</p>
          <p className="text-sm text-[var(--muted)]">{description}</p>
          {lastRun && <p className="mt-1 text-xs text-[var(--muted)]">Last run: {new Date(lastRun).toLocaleString()}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={onRun} disabled={disabled} className="rounded-full border-transparent">
          {icon}
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

export function BrainAutomationPanel({
  settings,
  triggering,
  onRunIngestion,
  onRunReinforcement,
}: {
  settings: BrainSettings;
  triggering: "ingest" | "reinforce" | null;
  onRunIngestion: () => void;
  onRunReinforcement: () => void;
}) {
  return (
    <Card className="border-transparent bg-[var(--sidebar-bg)]/85 p-5 shadow-sm shadow-black/5">
      <div className="mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5 text-[var(--muted)]" />
        <h2 className="text-lg font-medium text-[var(--foreground)]">Automation</h2>
      </div>

      <div className="space-y-3">
        <RunRow
          title="Ingestion"
          description={`Processes activity logs every ${settings.ingestionIntervalMinutes} minutes`}
          lastRun={settings.lastIngestionRun}
          actionLabel={triggering === "ingest" ? "Running..." : "Run Now"}
          onRun={onRunIngestion}
          disabled={triggering !== null}
          icon={<Play className="h-4 w-4" />}
        />
        <RunRow
          title="Reinforcement"
          description={`Strengthens memory entries every ${settings.reinforcementIntervalHours} hours`}
          lastRun={settings.lastReinforcementRun}
          actionLabel={triggering === "reinforce" ? "Running..." : "Run Now"}
          onRun={onRunReinforcement}
          disabled={triggering !== null}
          icon={<RefreshCw className="h-4 w-4" />}
        />
      </div>
    </Card>
  );
}
