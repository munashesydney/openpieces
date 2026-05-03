"use client";

import { ExternalLink, CopyPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "@/components/basic/buttons/button";
import { pushToHubAction } from "@/app/workspace/[workspaceId]/personal/services/[serviceId]/actions";

export function PushToHubButton({
  workspaceId,
  serviceId,
}: {
  workspaceId: string;
  serviceId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "idle" | "connecting" | "pushing" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [showForkModal, setShowForkModal] = useState(false);
  const [forking, setForking] = useState(false);

  const handlePush = async () => {
    setStatus("connecting");
    setMessage("");

    const result = await pushToHubAction(workspaceId, serviceId);

    if ("redirectUrl" in result) {
      router.push(result.redirectUrl);
      return;
    }

    if ("notOwner" in result) {
      setStatus("idle");
      setShowForkModal(true);
      return;
    }

    if ("error" in result) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("done");
    setMessage("Piece pushed to hub!");
    setTimeout(() => setStatus("idle"), 3000);
  };

  const handleFork = async () => {
    setForking(true);
    setShowForkModal(false);

    setStatus("pushing");
    setMessage("");

    const result = await pushToHubAction(workspaceId, serviceId, true);

    if ("redirectUrl" in result) {
      router.push(result.redirectUrl);
      return;
    }

    if ("error" in result) {
      setStatus("error");
      setMessage(result.error);
      setForking(false);
      return;
    }

    setStatus("done");
    setMessage("Fork pushed to hub!");
    setForking(false);
    setTimeout(() => {
      setStatus("idle");
      router.refresh();
    }, 1500);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePush}
          disabled={status === "connecting" || status === "pushing"}
          className="inline-flex items-center gap-1.5 rounded border border-violet-500/20 bg-violet-500/8 px-3 py-1.5 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-500/15 hover:text-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink size={12} />
          {status === "connecting"
            ? "Connecting…"
            : status === "pushing"
              ? "Pushing…"
              : "Push to Hub"}
        </button>
        {status === "done" && (
          <span className="text-[11px] text-emerald-400/80">{message}</span>
        )}
        {status === "error" && (
          <span className="text-[11px] text-red-400/80">{message}</span>
        )}
      </div>

      <Modal
        isOpen={showForkModal}
        onClose={() => setShowForkModal(false)}
        title="You don't own this hub piece"
        description="You can only push updates to pieces you created. Create your own copy to publish under your name."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForkModal(false)}
              disabled={forking}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFork}
              isLoading={forking}
            >
              <CopyPlus size={12} />
              Push as my copy
            </Button>
          </div>
        }
      >
        <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/60 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            What will happen
          </p>
          <ul className="space-y-1 text-sm text-[var(--foreground)]">
            <li>- A new piece will be created under your account</li>
            <li>- &quot; - Copy&quot; will be appended to the title</li>
            <li>- The hub link will be cleared from this service</li>
            <li>- Future pushes will update your new copy</li>
          </ul>
        </div>
      </Modal>
    </>
  );
}
