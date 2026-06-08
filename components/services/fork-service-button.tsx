import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { forkServiceLocallyAction } from "@/app/org/[ordId]/workspace/[workspaceId]/personal/services/[serviceId]/actions";
import { Button } from "@/components/basic/buttons/button";

export function ForkServiceButton({
  workspaceId,
  serviceId,
  orgId,
}: {
  workspaceId: string;
  serviceId: string;
  orgId: string;
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
    router.push(`/org/${orgId}/workspace/${workspaceId}/personal/services`);
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleFork}
        disabled={forking}
        isLoading={forking}
      >
        <Copy size={12} />
        {forking ? "Forking…" : "Fork Locally"}
      </Button>
      {error && <span className="text-[11px] text-red-400/80">{error}</span>}
    </div>
  );
}
