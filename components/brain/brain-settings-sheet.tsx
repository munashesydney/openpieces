"use client";

import { Play, RefreshCw } from "lucide-react";
import { Button } from "../basic/buttons/button";
import { Sheet } from "../ui/sheet";
import { BrainSettings } from "./brain-types";

function BrainSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="h-7 w-12 rounded-full bg-[var(--muted)]/60 transition-colors peer-checked:bg-[var(--accent)]" />
      <span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

function SettingBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-b border-[var(--border)] pb-5 last:border-b-0 last:pb-0">
      <div className="mb-3">
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function BrainSettingsSheet({
  isOpen,
  onClose,
  settings,
  setSettings,
  triggering,
  onRunIngestion,
  onRunReinforcement,
  savingSettings,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: BrainSettings;
  setSettings: (settings: BrainSettings) => void;
  triggering: "ingest" | "reinforce" | null;
  onRunIngestion: () => void;
  onRunReinforcement: () => void;
  savingSettings: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Brain Settings"
      description="Tune ingestion and reinforcement behavior"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      }
    >
      <div className="space-y-7">
        <SettingBlock title="Run Automation" description="Trigger ingestion or reinforcement immediately">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Process activity logs</p>
                <p className="text-xs text-[var(--muted)]">Extracts new facts and episodes into memory</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-transparent"
                onClick={onRunIngestion}
                disabled={triggering !== null}
              >
                <Play className="h-4 w-4" />
                {triggering === "ingest" ? "Running..." : "Run now"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Reinforce memories</p>
                <p className="text-xs text-[var(--muted)]">Strengthens existing lower-confidence entries</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-transparent"
                onClick={onRunReinforcement}
                disabled={triggering !== null}
              >
                <RefreshCw className="h-4 w-4" />
                {triggering === "reinforce" ? "Running..." : "Run now"}
              </Button>
            </div>
          </div>
        </SettingBlock>

        <SettingBlock title="Ingestion" description="Automatically processes activity logs into memory entries">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--foreground)]">Enable ingestion</p>
              <BrainSwitch
                checked={settings.ingestionEnabled}
                onChange={(checked) => setSettings({ ...settings, ingestionEnabled: checked })}
              />
            </div>
            {settings.ingestionEnabled && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--foreground)]">Ingestion interval</p>
                <select
                  value={settings.ingestionIntervalMinutes}
                  onChange={(e) =>
                    setSettings({ ...settings, ingestionIntervalMinutes: Number(e.target.value) })
                  }
                  className="rounded-md border-0 bg-[var(--sidebar-bg)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-1 ring-[var(--border)]"
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every hour</option>
                  <option value={120}>Every 2 hours</option>
                  <option value={360}>Every 6 hours</option>
                  <option value={720}>Every 12 hours</option>
                  <option value={1440}>Every 24 hours</option>
                </select>
              </div>
            )}
          </div>
        </SettingBlock>

        <SettingBlock title="Reinforcement" description="Boosts lower-confidence memories to improve retrieval">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--foreground)]">Enable reinforcement</p>
              <BrainSwitch
                checked={settings.reinforcementEnabled}
                onChange={(checked) => setSettings({ ...settings, reinforcementEnabled: checked })}
              />
            </div>
            {settings.reinforcementEnabled && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--foreground)]">Reinforcement interval</p>
                <select
                  value={settings.reinforcementIntervalHours}
                  onChange={(e) =>
                    setSettings({ ...settings, reinforcementIntervalHours: Number(e.target.value) })
                  }
                  className="rounded-md border-0 bg-[var(--sidebar-bg)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-1 ring-[var(--border)]"
                >
                  <option value={1}>Every hour</option>
                  <option value={6}>Every 6 hours</option>
                  <option value={12}>Every 12 hours</option>
                  <option value={24}>Every 24 hours</option>
                  <option value={48}>Every 2 days</option>
                  <option value={168}>Every week</option>
                </select>
              </div>
            )}
          </div>
        </SettingBlock>
      </div>
    </Sheet>
  );
}
