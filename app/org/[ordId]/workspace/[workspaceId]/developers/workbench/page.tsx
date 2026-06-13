import { redirect } from "next/navigation";
import { getWebhookDeliveries } from "@/lib/services/webhook.service";
import { WorkbenchClient } from "./client";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";

export default async function WorkbenchPage({
  params,
}: {
  params: Promise<{ ordId: string; workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  try {
    await requireWorkspaceOwner(workspaceId);
  } catch {
    redirect("/");
  }

  const limit = 50; // Change this value to adjust the number of items per page
  const initialDeliveries = await getWebhookDeliveries(workspaceId, limit);

  return (
    <WorkbenchClient
      initialDeliveries={JSON.parse(JSON.stringify(initialDeliveries))}
      workspaceId={workspaceId}
      limit={limit}
    />
  );
}
