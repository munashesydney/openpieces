import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { UsageClient } from "./client";

export default async function UsagePage(props: {
  params: Promise<{ ordId: string; workspaceId: string }>;
}) {
  const { workspaceId, ordId } = await props.params;
  await requireWorkspaceOwner(workspaceId);

  return <UsageClient workspaceId={workspaceId} ordId={ordId} />;
}
