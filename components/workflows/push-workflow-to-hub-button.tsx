"use client";

import { ExternalLink, Settings, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "@/components/basic/buttons/button";
import { pushWorkflowToHubAction } from "@/app/org/[ordId]/workspace/[workspaceId]/personal/workflows/actions";

export function PushWorkflowToHubButton({
  workspaceId,
  workflowId,
  orgId,
}: {
  workspaceId: string;
  workflowId: string;
  orgId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "idle" | "connecting" | "pushing" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handlePush = async () => {
    setStatus("connecting");
    setMessage("");

    const result = await pushWorkflowToHubAction(workspaceId, workflowId);

    if ("redirectUrl" in result) {
      router.push(result.redirectUrl);
      return;
    }

    if ("notOwner" in result) {
      setStatus("error");
      setMessage(
        "You don't own one of the services on the hub. Fork them individually first.",
      );
      setTimeout(() => setStatus("idle"), 5000);
      return;
    }

    if ("error" in result) {
      setStatus("error");
      setMessage(result.error);
      setTimeout(() => setStatus("idle"), 5000);
      return;
    }

    setStatus("done");
    setMessage("Workflow pushed to hub!");
    setTimeout(() => setStatus("idle"), 3000);
  };

  return (
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
  );
}
