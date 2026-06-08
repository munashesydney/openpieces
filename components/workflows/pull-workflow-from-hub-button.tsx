"use client";

import {
  Download,
  Settings,
  KeyRound,
  Search,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "@/components/basic/buttons/button";
import { Sheet } from "../ui/sheet";
import { Input } from "@/components/basic/input/input";
import { checkHubSetup } from "@/lib/services/hub-setup.service";
import { pullWorkflowFromHubAction } from "@/app/org/[ordId]/workspace/[workspaceId]/personal/workflows/actions";

// Local type matching what the proxy API returns
type HubWorkflowListItem = {
  id: string;
  title: string;
  description: string;
  [key: string]: unknown;
};

export function PullWorkflowFromHubButton({
  workspaceId,
  existingWorkflowId,
  orgId,
}: {
  workspaceId: string;
  existingWorkflowId?: string;
  orgId: string;
}) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupHubUrl, setSetupHubUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<HubWorkflowListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<HubWorkflowListItem | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingWorkflow, setPendingWorkflow] =
    useState<HubWorkflowListItem | null>(null);

  // ── Search (via proxy route) ─────────────────
  let searchTimer: ReturnType<typeof setTimeout>;
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      if (!value.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/hub/workflows?search=${encodeURIComponent(value)}&limit=10`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.workflows ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  // ── Select workflow → confirm ──────────────────
  const handleSelect = (wf: HubWorkflowListItem) => {
    setPendingWorkflow(wf);
    setIsConfirmOpen(true);
  };

  // ── Confirm pull ───────────────────────────────
  const handleConfirmPull = async () => {
    if (!pendingWorkflow) return;
    setPulling(true);
    setPullMessage(null);

    const result = await pullWorkflowFromHubAction(
      workspaceId,
      existingWorkflowId ?? null,
      pendingWorkflow.id,
    );

    if ("redirectUrl" in result) {
      router.push(result.redirectUrl);
      return;
    }

    if ("error" in result) {
      setPullMessage(result.error);
      setPulling(false);
      return;
    }

    setPulling(false);
    setIsConfirmOpen(false);
    setIsSheetOpen(false);
    setPendingWorkflow(null);
    setSearchQuery("");
    setResults([]);
    router.refresh();
  };

  const handleOpenSheet = async () => {
    const setup = await checkHubSetup();
    if (!setup.configured) {
      setSetupHubUrl(setup.hubUrl);
      setShowSetupModal(true);
      return;
    }
    setIsSheetOpen(true);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpenSheet}>
        <Download size={12} />
        Pull from Hub
      </Button>

      {/* Search Sheet */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setSearchQuery("");
          setResults([]);
          setSelectedWorkflow(null);
          setPullMessage(null);
        }}
        title="Pull Workflow from Hub"
        description="Search for workflows on the hub to pull into your workspace."
        footer={<></>}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {searching && (
            <div className="text-center text-sm text-[var(--muted)] py-6">
              Searching…
            </div>
          )}

          {!searching && searchQuery && results.length === 0 && (
            <div className="text-center text-sm text-[var(--muted)] py-6">
              No workflows found.
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {results.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => handleSelect(wf)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-[var(--hover-bg)] ${
                    selectedWorkflow?.id === wf.id
                      ? "border-[var(--accent)] bg-[var(--accent-glow)]/10"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {wf.title}
                      </p>
                      {wf.description && (
                        <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                          {wf.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 ml-2 text-[10px] text-[var(--muted)]">
                      {(wf as any).serviceCount ?? "?"} services,{" "}
                      {(wf as any).taskCount ?? "?"} tasks
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Sheet>

      {/* Confirm Pull Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!pulling) {
            setIsConfirmOpen(false);
            setPendingWorkflow(null);
          }
        }}
        title="Pull Workflow from Hub"
        description={
          existingWorkflowId
            ? "This will replace the current workflow with the hub version."
            : "A new workflow will be created with all linked services and tasks."
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsConfirmOpen(false);
                setPendingWorkflow(null);
              }}
              disabled={pulling}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmPull}
              disabled={pulling}
              isLoading={pulling}
            >
              {pulling ? "Pulling…" : "Confirm Pull"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {pendingWorkflow && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/60 p-3 space-y-1">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {pendingWorkflow.title}
              </p>
              {pendingWorkflow.description && (
                <p className="text-xs text-[var(--muted)]">
                  {pendingWorkflow.description}
                </p>
              )}
            </div>
          )}
          {pullMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {pullMessage}
            </div>
          )}
        </div>
      </Modal>

      {/* Hub not configured modal */}
      <Modal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        title="Hub not configured"
        description="Set up your hub API key to push and pull workflows."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSetupModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowSetupModal(false);
                router.push(
                  `/org/${orgId}/workspace/${workspaceId}/settings/hub`,
                );
              }}
            >
              <Settings size={12} />
              Open Hub Settings
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/15 bg-amber-500/5 p-3">
            <KeyRound size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <p className="text-xs font-semibold text-amber-300/90">
                API key missing
              </p>
              <p className="mt-1 text-[12px] text-amber-200/60">
                You need an API key from{" "}
                <a
                  href="https://openpieces.com/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300/80 underline underline-offset-2 hover:text-amber-200"
                >
                  openpieces.com/profile
                </a>{" "}
                configured in your{" "}
                <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px]">
                  .env
                </code>{" "}
                file.
              </p>
            </div>
          </div>
          <p className="text-[12px] text-[var(--muted)]">
            Go to Hub Settings for step-by-step instructions.
          </p>
        </div>
      </Modal>
    </>
  );
}
