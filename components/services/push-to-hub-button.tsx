"use client";

import { ExternalLink, Settings, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "@/components/basic/buttons/button";
import { pushToHubAction } from "@/app/org/[ordId]/workspace/[workspaceId]/personal/services/[serviceId]/actions";
import { checkHubSetup } from "@/lib/services/hub-setup.service";

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
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupHubUrl, setSetupHubUrl] = useState("");

  const handlePush = async () => {
    setStatus("connecting");
    setMessage("");

    // Check hub is configured first
    const setup = await checkHubSetup();
    if (!setup.configured) {
      setStatus("idle");
      setSetupHubUrl(setup.hubUrl);
      setShowSetupModal(true);
      return;
    }

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

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePush}
          disabled={status === "connecting" || status === "pushing"}
          isLoading={status === "connecting" || status === "pushing"}
        >
          <ExternalLink size={12} />
          {status === "connecting"
            ? "Connecting…"
            : status === "pushing"
              ? "Pushing…"
              : "Push to Hub"}
        </Button>
        {status === "done" && (
          <span className="text-[11px] text-emerald-400/80">{message}</span>
        )}
        {status === "error" && (
          <span className="text-[11px] text-red-400/80">{message}</span>
        )}
      </div>

      {/* Fork modal */}
      <Modal
        isOpen={showForkModal}
        onClose={() => setShowForkModal(false)}
        title="You don't own this hub piece"
        description="You can only push updates to pieces you created. Create a local copy first, then push your own version."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForkModal(false)}
            >
              Got it
            </Button>
          </div>
        }
      >
        <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/60 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            What to do
          </p>
          <ol className="space-y-1 text-sm text-[var(--foreground)] list-decimal list-inside">
            <li>
              Click <strong>Fork Locally</strong> to create your own copy
            </li>
            <li>Modify it however you like</li>
            <li>Push your new version to the hub</li>
          </ol>
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
