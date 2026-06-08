"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain as BrainIcon, Clock, Database, TrendingUp } from "lucide-react";
import {
  getBrainSettingsAction,
  getBrainEntriesAction,
  getBrainStatsAction,
  updateBrainSettingsAction,
  triggerBrainIngestionAction,
  triggerBrainReinforcementAction,
} from "@/app/org/[ordId]/workspace/[workspaceId]/brain/actions";
import { BrainEntry, BrainSettings, BrainStats } from "./brain-types";
import { BrainHeader } from "./brain-header";
import { BrainStatCard } from "./brain-stat-card";
import { BrainEntriesPanel } from "./brain-entries-panel";
import { BrainSettingsSheet } from "./brain-settings-sheet";
import { BrainEntryModal } from "./brain-entry-modal";

export function BrainView({
  workspaceId,
  initialStats,
  initialSettings,
  initialEntries,
  totalEntries,
  currentPage,
  pageSize,
}: {
  workspaceId: string;
  initialStats: BrainStats;
  initialSettings: BrainSettings;
  initialEntries: BrainEntry[];
  totalEntries: number;
  currentPage: number;
  pageSize: number;
}) {
  const [stats, setStats] = useState(initialStats);
  const [settings, setSettings] = useState(initialSettings);
  const [entries, setEntries] = useState(initialEntries);
  const [triggering, setTriggering] = useState<"ingest" | "reinforce" | null>(
    null,
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BrainEntry | null>(null);

  const loadData = useCallback(
    async (page: number) => {
      try {
        const [statsData, settingsData, entriesData] = await Promise.all([
          getBrainStatsAction(workspaceId),
          getBrainSettingsAction(workspaceId),
          getBrainEntriesAction(workspaceId, page),
        ]);

        setStats(statsData);
        if (settingsData) setSettings(settingsData as BrainSettings);
        setEntries(entriesData.data || []);
      } catch (error) {
        console.error("Failed to load brain data:", error);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    loadData(currentPage);
  }, [currentPage, loadData]);

  async function handleTriggerIngest() {
    setTriggering("ingest");
    setMessage(null);
    try {
      const result = await triggerBrainIngestionAction(workspaceId);
      if ("chatId" in result) {
        setMessage({
          type: "success",
          text: result.message || "Ingestion triggered successfully",
        });
        await loadData(currentPage);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to trigger ingestion",
        });
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
        setMessage({
          type: "success",
          text: result.message || "Reinforcement triggered successfully",
        });
        await loadData(currentPage);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to trigger reinforcement",
        });
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
      if (
        "success" in result &&
        result.success &&
        "settings" in result &&
        result.settings
      ) {
        setSettings(result.settings as BrainSettings);
        setSettingsSheetOpen(false);
        setMessage({ type: "success", text: "Settings saved successfully" });
      } else {
        const errorMsg =
          "error" in result ? result.error : "Failed to save settings";
        setMessage({ type: "error", text: errorMsg });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex w-full justify-center px-6 pb-20 pt-8">
        <div className="w-full px-4 space-y-8">
          <BrainHeader onOpenSettings={() => setSettingsSheetOpen(true)} />

          {message && (
            <div
              className={`rounded px-4 py-3 text-[13px] ${
                message.type === "success"
                  ? "bg-green-500/12 text-green-500"
                  : "bg-red-500/12 text-red-500"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <BrainStatCard
              icon={<Database className="h-5 w-5" />}
              label="Total Entries"
              value={stats.totalEntries.toString()}
            />
            <BrainStatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Average Confidence"
              value={`${Math.round(stats.averageConfidence * 100)}%`}
            />
            <BrainStatCard
              icon={<BrainIcon className="h-5 w-5" />}
              label="Facts"
              value={stats.factsCount.toString()}
            />
            <BrainStatCard
              icon={<Clock className="h-5 w-5" />}
              label="Episodes"
              value={stats.episodesCount.toString()}
            />
          </div>

          <div className="grid gap-6">
            <BrainEntriesPanel
              entries={entries}
              totalEntries={totalEntries}
              currentPage={currentPage}
              pageSize={pageSize}
              triggering={triggering}
              onProcessLogs={handleTriggerIngest}
              onEntryClick={setSelectedEntry}
            />
          </div>

          <BrainSettingsSheet
            isOpen={settingsSheetOpen}
            onClose={() => setSettingsSheetOpen(false)}
            settings={settings}
            setSettings={setSettings}
            triggering={triggering}
            onRunIngestion={handleTriggerIngest}
            onRunReinforcement={handleTriggerReinforce}
            savingSettings={savingSettings}
            onSave={() => handleSaveSettings(settings)}
          />
          <BrainEntryModal
            entry={selectedEntry}
            isOpen={selectedEntry !== null}
            onClose={() => setSelectedEntry(null)}
          />
        </div>
      </div>
    </div>
  );
}
