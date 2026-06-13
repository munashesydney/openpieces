import { redirect } from "next/navigation";
import { getWebhooks } from "@/lib/services/webhook.service";
import { WebhooksClient } from "./client";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";

export default async function WebhooksPage({
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

  const initialWebhooks = await getWebhooks(workspaceId);

  return (
    <WebhooksClient initialWebhooks={initialWebhooks} workspaceId={workspaceId} />
  );
}
