"use client";

import { Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { forkServiceLocallyAction } from "@/app/workspace/[workspaceId]/personal/services/[serviceId]/actions";

export function ForkServiceButton({
  workspaceId,
  serviceId,
}: {
  workspaceId: string;
  serviceId: string;
}) {
  const router = useRouter();
  const [forking, setForking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFork = async () => {
    setForking(true);
    setError(null);

    const result = await forkServiceLocallyAction(workspaceId, serviceId);

    if ("error" in result) {
      setError(result.error);
      setForking(false);
      return;
    }

    // Navigating to the services list so they can see their new fork
    router.push(`/workspace/${workspaceId}/personal/services`);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleFork}
        disabled={forking}
        className="inline-flex items-center gap-1.5 rounded border border-violet-500/20 bg-violet-500/8 px-3 py-1.5 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-500/15 hover:text-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {forking ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Copy size={12} />
        )}
        {forking ? "Forking…" : "Fork Locally"}
      </button>
      {error && (
        <span className="text-[11px] text-red-400/80">{error}</span>
      )}
    </div>
  );
}
