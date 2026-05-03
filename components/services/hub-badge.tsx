import { ExternalLink } from "lucide-react";

export function HubBadge({
  hubPieceId,
}: {
  hubPieceId: string | null;
}) {
  if (!hubPieceId) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-medium text-white/30">
        Local
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-violet-500/15 bg-violet-500/8 px-1.5 py-0.5 text-[9px] font-medium text-violet-400/70">
      <ExternalLink size={9} />
      Hub
    </span>
  );
}
