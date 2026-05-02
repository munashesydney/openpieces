"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { pushToHubAction } from "@/app/workspace/[workspaceId]/personal/services/[serviceId]/actions";

export function PushToHubButton({
  workspaceId,
  serviceId,
}: {
  workspaceId: string;
  serviceId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "connecting" | "pushing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handlePush = async () => {
    setStatus("connecting");
    setMessage("");

    const result = await pushToHubAction(workspaceId, serviceId);

    if ("redirectUrl" in result) {
      // Not connected yet — redirect to OAuth
      router.push(result.redirectUrl);
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
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handlePush}
        disabled={status === "connecting" || status === "pushing"}
        className="inline-flex items-center gap-1.5 rounded border border-violet-500/20 bg-violet-500/8 px-3 py-1.5 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-500/15 hover:text-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ExternalLink size={12} />
        {status === "connecting" ? "Connecting…" : status === "pushing" ? "Pushing…" : "Push to Hub"}
      </button>
      {status === "done" && (
        <span className="text-[11px] text-emerald-400/80">{message}</span>
      )}
      {status === "error" && (
        <span className="text-[11px] text-red-400/80">{message}</span>
      )}
    </div>
  );
}
