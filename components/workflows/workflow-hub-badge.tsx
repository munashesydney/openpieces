"use client";

import { ExternalLink } from "lucide-react";

export function WorkflowHubBadge({
  hubWorkflowId,
}: {
  hubWorkflowId: string | null | undefined;
}) {
  if (!hubWorkflowId) return null;

  const hubUrl =
    process.env.NEXT_PUBLIC_OPENPIECES_HUB_URL ?? "https://openpieces.com";

  return (
    <a
      href={`${hubUrl}/workflows/${hubWorkflowId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded border border-violet-500/15 bg-violet-500/8 px-1.5 py-0.5 text-[9px] font-medium text-violet-400/70 hover:text-violet-300 transition-colors"
    >
      <ExternalLink size={9} />
      Hub
    </a>
  );
}
