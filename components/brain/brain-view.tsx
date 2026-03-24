"use client";

import { useState } from "react";
import { Brain as BrainIcon, Settings, Clock, TrendingUp, Database, Play, RefreshCw } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../basic/buttons/button";
import { Sheet } from "../ui/sheet";
import {
  getBrainSettingsAction,
  getBrainEntriesAction,
  getBrainStatsAction,
  updateBrainSettingsAction,
  triggerBrainIngestionAction,
  triggerBrainReinforcementAction,
} from "@/app/workspace/[workspaceId]/brain/actions";

type BrainStats = {
  totalEntries: number;
  factsCount: number;
  episodesCount: number;
  averageConfidence: number;
};

type BrainSettings = {
  ingestionEnabled: boolean;
  ingestionIntervalMinutes: number;
  reinforcementEnabled: boolean;
  reinforcementIntervalHours: number;
  lastIngestionRun: Date | null;
  lastReinforcementRun: Date | null;
};

type BrainEntry = {
  id: string;
  type: string;
  category: string;
  summary: string;
  confidence: number;
  reinforcementCount: number;
  createdAt: Date;
  tags: string[] | null;
};

export function BrainView({
  workspaceId,
  initialStats,
  initialSettings,
  initialEntries,
}: {
  workspaceId: string;
  initialStats: BrainStats;
  initialSettings: BrainSettings;
  initialEntries: BrainEntry[];
}) {
  const [stats, setStats] = useState(initialStats);
  const [settings, setSettings] = useState(initialSettings);
  const [entries, setEntries] = useState(initialEntries);
  const [triggering, setTriggering] = useState<"ingest" | "reinforce" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  async function loadData() {
    try {
      const [statsData, settingsData, entriesData] = await Promise.all([
        getBrainStatsAction(workspaceId),
        getBrainSettingsAction(workspaceId),
        getBrainEntriesAction(workspaceId, 1),
      ]);

      setStats(statsData);
      if (settingsData) setSettings(settingsData as BrainSettings);
      setEntries(entriesData.data || []);
    } catch (error) {
      console.error("Failed to load brain data:", error);
    }
  }

  async function handleTriggerIngest() {
    setTriggering("ingest");
    setMessage(null);
    try {
      const result = await triggerBrainIngestionAction(workspaceId);
      if ("chatId" in result) {
        setMessage({ type: "success", text: result.message || "Ingestion triggered successfully" });
        await loadData();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to trigger ingestion" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to trigger ingestion" });
    } finally {
      setTriggering(null);
    }
  }

  async function handleTriggerReinforce() {
    setTriggering("reinforce");
    setMessage(null);
    try {
      const result = await triggerBrainReinforcementAction(workspaceId);
      if ("chatId" in result) {
        setMessage({ type: "success", text: result.message || "Reinforcement triggered successfully" });
        await loadData();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to trigger reinforcement" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to trigger reinforcement" });
    } finally {
      setTriggering(null);
    }
  }

  async function handleSaveSettings(newSettings: Partial<BrainSettings>) {
    setSavingSettings(true);
    try {
      const result = await updateBrainSettingsAction(workspaceId, newSettings);
      if ("success" in result && result.success && "settings" in result && result.settings) {
        setSettings(result.settings as BrainSettings);
        setSettingsSheetOpen(false);
        setMessage({ type: "success", text: "Settings saved successfully" });
      } else {
        const errorMsg = "error" in result ? result.error : "Failed to save settings";
        setMessage({ type: "error", text: errorMsg });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainIcon className="h-8 w-8 text-[var(--primary)]" />
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Workspace Brain</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsSheetOpen(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {message && (
        <div className={`rounded-md p-3 ${message.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Database className="h-5 w-5" />}
          label="Total Entries"
          value={stats.totalEntries.toString()}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Average Confidence"
          value={`${Math.round(stats.averageConfidence * 100)}%`}
        />
        <StatCard
          icon={<BrainIcon className="h-5 w-5" />}
          label="Facts"
          value={stats.factsCount.toString()}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Episodes"
          value={stats.episodesCount.toString()}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Brain Entries List */}
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-[var(--foreground)]">Recent Brain Entries</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerIngest}
              disabled={triggering !== null}
            >
              <Play className="mr-2 h-4 w-4" />
              {triggering === "ingest" ? "Processing..." : "Process Activity Logs"}
            </Button>
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No brain entries yet. Click &quot;Process Activity Logs&quot; to start.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-start justify-between rounded-md border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">{entry.summary}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">
                        {entry.type} · {entry.category}
                      </span>
                      {entry.tags && entry.tags.length > 0 && (
                        <span className="text-xs text-[var(--muted)]">
                          · {entry.tags.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="text-sm font-medium text-[var(--primary)]">
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Settings */}
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[var(--muted)]" />
            <h2 className="text-lg font-medium text-[var(--foreground)]">Brain Settings</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium text-[var(--foreground)]">Ingestion</p>
                <p className="text-sm text-[var(--muted)]">
                  Process unprocessed activity logs every {settings.ingestionIntervalMinutes} minutes
                </p>
                {settings.lastIngestionRun && (
                  <p className="text-xs text-[var(--muted)]">
                    Last run: {new Date(settings.lastIngestionRun).toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerIngest}
                disabled={triggering !== null}
              >
                <Play className="mr-2 h-4 w-4" />
                Run Now
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium text-[var(--foreground)]">Reinforcement</p>
                <p className="text-sm text-[var(--muted)]">
                  Strengthen memory entries every {settings.reinforcementIntervalHours} hours
                </p>
                {settings.lastReinforcementRun && (
                  <p className="text-xs text-[var(--muted)]">
                    Last run: {new Date(settings.lastReinforcementRun).toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerReinforce}
                disabled={triggering !== null}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {triggering === "reinforce" ? "Running..." : "Run Now"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Sheet
        isOpen={settingsSheetOpen}
        onClose={() => setSettingsSheetOpen(false)}
        title="Brain Settings"
        description="Configure how often the brain processes activity logs and reinforces memories"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSettingsSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSaveSettings(settings)}
              disabled={savingSettings}
            >
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {/* Ingestion Settings */}
          <div className="flex flex-col gap-4">
            <h3 className="font-medium text-[var(--foreground)]">Ingestion</h3>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium text-[var(--foreground)]">Enable Ingestion</p>
                <p className="text-sm text-[var(--muted)]">Automatically process activity logs</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.ingestionEnabled}
                  onChange={(e) => setSettings({ ...settings, ingestionEnabled: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-[var(--muted)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--primary)] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>
            {settings.ingestionEnabled && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-[var(--foreground)]">Ingestion Interval</p>
                  <p className="text-sm text-[var(--muted)]">How often to check for new activity logs</p>
                </div>
                <select
                  value={settings.ingestionIntervalMinutes}
                  onChange={(e) => setSettings({ ...settings, ingestionIntervalMinutes: Number(e.target.value) })}
                  className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
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

          {/* Reinforcement Settings */}
          <div className="flex flex-col gap-4">
            <h3 className="font-medium text-[var(--foreground)]">Reinforcement</h3>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium text-[var(--foreground)]">Enable Reinforcement</p>
                <p className="text-sm text-[var(--muted)]">Automatically reinforce low-confidence memories</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.reinforcementEnabled}
                  onChange={(e) => setSettings({ ...settings, reinforcementEnabled: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-[var(--muted)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--primary)] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>
            {settings.reinforcementEnabled && (
              <>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Reinforcement Interval</p>
                    <p className="text-sm text-[var(--muted)]">How often to reinforce memories</p>
                  </div>
                  <select
                    value={settings.reinforcementIntervalHours}
                    onChange={(e) => setSettings({ ...settings, reinforcementIntervalHours: Number(e.target.value) })}
                    className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <option value={1}>Every hour</option>
                    <option value={6}>Every 6 hours</option>
                    <option value={12}>Every 12 hours</option>
                    <option value={24}>Every 24 hours</option>
                    <option value={48}>Every 2 days</option>
                    <option value={168}>Every week</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
        {icon}
      </div>
      <div>
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <p className="text-2xl font-semibold text-[var(--foreground)]">{value}</p>
      </div>
    </Card>
  );
}
