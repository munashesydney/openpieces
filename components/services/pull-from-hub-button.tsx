"use client";

import {
  Download,
  Loader2,
  AlertTriangle,
  Settings,
  KeyRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Sheet } from "../ui/sheet";
import { Modal } from "../ui/modal";
import { Button } from "@/components/basic/buttons/button";
import { pullFromHubAction } from "@/app/workspace/[workspaceId]/personal/services/[serviceId]/actions";
import { checkHubSetup } from "@/lib/services/hub-setup.service";

type HubPiece = {
  id: string;
  title: string;
  description: string;
  category: "TRIGGER" | "ACTION";
};

export function PullFromHubButton({
  workspaceId,
  serviceId,
  serviceType,
}: {
  workspaceId: string;
  serviceId: string;
  serviceType: "trigger" | "action";
}) {
  const router = useRouter();

  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [directUuid, setDirectUuid] = useState("");
  const useDirectId = directUuid.trim().length > 0;

  // Search state
  const [results, setResults] = useState<HubPiece[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<HubPiece | null>(null);

  // Pull state
  const [pulling, setPulling] = useState(false);
  const [pullMessage, setPullMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Confirmation modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingPiece, setPendingPiece] = useState<HubPiece | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear selections when inputs change
  useEffect(() => {
    setSelectedPiece(null);
    setPullMessage(null);
    setTypeError(null);
  }, [searchQuery, directUuid]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || useDirectId) {
      setResults([]);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/hub/pieces?search=${encodeURIComponent(searchQuery)}&limit=10`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.pieces ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery, useDirectId]);

  // Resolve piece ID from either direct UUID or selected result
  const isValidUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      directUuid.trim(),
    );
  const resolvedPieceId = useDirectId
    ? isValidUuid
      ? directUuid.trim()
      : null
    : (selectedPiece?.id ?? null);

  // The piece data we have (from search or fetched by UUID)
  const pieceForPull = useDirectId ? pendingPiece : selectedPiece;

  // Validate type compatibility
  const hasTypeMatch =
    !pieceForPull || pieceForPull.category.toLowerCase() === serviceType;

  /** Fetch piece data by UUID (for direct UUID mode when Pull is clicked). */
  const fetchPieceByUuid = async (uuid: string): Promise<HubPiece | null> => {
    try {
      const res = await fetch(`/api/hub/pieces/${uuid}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  };

  /** Called when user clicks "Pull". First checks types, then shows confirmation. */
  const handlePullClick = async () => {
    if (!resolvedPieceId) return;
    setTypeError(null);

    let piece: HubPiece | null = selectedPiece;

    // If using direct UUID and we don't have the piece data yet, fetch it
    if (useDirectId && !piece) {
      piece = await fetchPieceByUuid(resolvedPieceId);
      if (!piece) {
        setPullMessage({
          type: "error",
          text: "Piece not found. Check the UUID and try again.",
        });
        return;
      }
      setPendingPiece(piece);
    }

    if (!piece) return;

    // Check type compatibility
    if (piece.category.toLowerCase() !== serviceType) {
      setTypeError(
        `Type mismatch: this service is "${serviceType}" but the hub piece is "${piece.category.toLowerCase()}". You can only pull pieces with the same type.`,
      );
      return;
    }

    // Types match — show confirmation modal
    setIsConfirmOpen(true);
  };

  /** Called when user confirms in the modal. */
  const handleConfirmPull = async () => {
    if (!resolvedPieceId) return;
    setIsConfirmOpen(false);
    setPulling(true);
    setPullMessage(null);

    const result = await pullFromHubAction(
      workspaceId,
      serviceId,
      resolvedPieceId,
    );

    if ("redirectUrl" in result) {
      router.push(result.redirectUrl);
      return;
    }

    if ("error" in result) {
      setPullMessage({ type: "error", text: result.error });
    } else {
      setPullMessage({ type: "success", text: "Piece pulled successfully!" });
      setTimeout(() => {
        setIsSheetOpen(false);
        setPullMessage(null);
        router.refresh();
      }, 1500);
    }

    setPulling(false);
  };

  const handleClose = () => {
    setIsSheetOpen(false);
    setSearchQuery("");
    setDirectUuid("");
    setSelectedPiece(null);
    setPendingPiece(null);
    setPullMessage(null);
    setTypeError(null);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={async () => {
          const setup = await checkHubSetup();
          if (!setup.configured) {
            setShowSetupModal(true);
          } else {
            setIsSheetOpen(true);
          }
        }}
      >
        <Download size={12} />
        Pull from Hub
      </Button>

      <Sheet
        isOpen={isSheetOpen}
        onClose={handleClose}
        title="Pull from Hub"
        description="Search for a piece or enter a UUID to pull code into this service."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePullClick}
              disabled={!resolvedPieceId || pulling}
              isLoading={pulling}
            >
              <Download size={12} />
              Pull
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Search input */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-wider text-white/40">
              Search pieces
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setDirectUuid("");
              }}
              placeholder="e.g. GitHub connector"
              className="w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-violet-500/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-white/6" />
            <span className="text-[10px] text-white/30">OR</span>
            <div className="flex-1 border-t border-white/6" />
          </div>

          {/* Direct UUID input */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-wider text-white/40">
              Enter piece UUID
            </label>
            <input
              type="text"
              value={directUuid}
              onChange={(e) => {
                setDirectUuid(e.target.value);
                if (e.target.value) {
                  setSearchQuery("");
                  setResults([]);
                }
              }}
              placeholder="d02128b5-f1da-470a-9a31-5abc6d7de500"
              className="w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] font-mono text-white outline-none transition-colors placeholder:text-white/20 focus:border-violet-500/40"
            />
          </div>

          {/* UUID validation hint */}
          {useDirectId && !isValidUuid && directUuid.length > 0 && (
            <p className="text-[10px] text-red-400/70">
              Invalid UUID format. Use the format:
              xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
            </p>
          )}

          {/* Search results */}
          {searchQuery && !useDirectId && (
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-white/30">
                {searching
                  ? "Searching…"
                  : `${results.length} result${results.length !== 1 ? "s" : ""}`}
              </p>

              {searching && results.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={16} className="animate-spin text-white/30" />
                </div>
              )}

              {!searching && results.length === 0 && searchQuery && (
                <p className="py-6 text-center text-[11px] text-white/30">
                  No pieces found.
                </p>
              )}

              <div className="max-h-[280px] space-y-1 overflow-y-auto">
                {results.map((piece) => {
                  const matchesType =
                    piece.category.toLowerCase() === serviceType;
                  return (
                    <button
                      key={piece.id}
                      type="button"
                      onClick={() => {
                        setSelectedPiece(piece);
                        setTypeError(null);
                      }}
                      className={`w-full rounded border px-3 py-2.5 text-left transition-colors ${
                        selectedPiece?.id === piece.id
                          ? "border-violet-500/40 bg-violet-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-medium text-white/80">
                          {piece.title}
                        </p>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ${
                            matchesType
                              ? "bg-emerald-500/10 text-emerald-400/60"
                              : "bg-red-500/10 text-red-400/60"
                          }`}
                        >
                          {piece.category}
                        </span>
                      </div>
                      {piece.description && (
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-white/30">
                          {piece.description}
                        </p>
                      )}
                      <p className="mt-0.5 font-mono text-[8px] text-white/20">
                        {piece.id}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected piece indicator */}
          {resolvedPieceId && !useDirectId && selectedPiece && (
            <div
              className={`rounded border px-3 py-2.5 ${
                hasTypeMatch
                  ? "border-emerald-500/20 bg-emerald-500/8"
                  : "border-red-500/20 bg-red-500/8"
              }`}
            >
              <p
                className={`text-[10px] font-medium ${
                  hasTypeMatch ? "text-emerald-300/80" : "text-red-300/80"
                }`}
              >
                {hasTypeMatch ? "Selected" : "Type mismatch"}
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-white/80">
                {selectedPiece.title}
              </p>
              <p className="mt-0.5 text-[10px] text-white/40">
                {selectedPiece.category} &middot; {serviceType}
              </p>
            </div>
          )}

          {useDirectId && resolvedPieceId && !pieceForPull && (
            <div className="rounded border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
              <p className="text-[10px] font-medium text-amber-300/80">
                Pulling by UUID
              </p>
              <p className="mt-0.5 break-all font-mono text-[11px] text-white/60">
                {resolvedPieceId}
              </p>
              <p className="mt-0.5 text-[10px] text-white/40">
                Type will be checked when you click Pull
              </p>
            </div>
          )}

          {/* Type error displayed in sheet */}
          {typeError && (
            <div className="flex items-start gap-2 rounded border border-red-500/20 bg-red-500/8 px-3 py-2.5">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-red-400"
              />
              <p className="text-[11px] text-red-300/80">{typeError}</p>
            </div>
          )}

          {/* Pull message */}
          {pullMessage && (
            <div
              className={`rounded border px-3 py-2.5 text-[11px] ${
                pullMessage.type === "success"
                  ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-300/80"
                  : "border-red-500/20 bg-red-500/8 text-red-300/80"
              }`}
            >
              {pullMessage.text}
            </div>
          )}
        </div>
      </Sheet>

      {/* Confirmation modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        danger
        title="Overwrite service with hub piece?"
        description="This action will permanently replace the current service code and metadata."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              disabled={pulling}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmPull}
              isLoading={pulling}
            >
              {pulling ? "Pulling..." : "Overwrite & Pull"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--foreground)]">
            You are about to replace{" "}
            <span className="font-semibold">
              &quot;{pieceForPull?.title ?? "this service"}&quot;
            </span>{" "}
            with the hub piece.
          </p>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              What will happen
            </p>
            <ul className="space-y-1 text-sm text-[var(--foreground)]">
              <li>- All current source code files will be deleted</li>
              <li>- The hub piece's code will be extracted in their place</li>
              <li>- The service title and description will be overwritten</li>
              <li>- Service endpoints and configuration will be preserved</li>
            </ul>
          </div>

          <p className="text-xs text-[var(--muted)]">
            Make sure you have pushed or backed up any changes before
            continuing. This action cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Hub not configured modal */}
      <Modal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        title="Hub not configured"
        description="Set up your hub API key to push and pull pieces."
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
                router.push(`/workspace/${workspaceId}/settings/hub`);
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
