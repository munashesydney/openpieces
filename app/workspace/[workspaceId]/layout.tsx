import { notFound } from "next/navigation";
import { requireUser } from "../../../lib/services/auth.service";
import { getWorkspaceOwnedByUser } from "../../../lib/services/workspace.service";
import { isValidUuid } from "../../../lib/utils/uuid";

export default async function WorkspaceLayout(props: {
  children: React.ReactNode;
  params: Promise<{
    workspaceId: string;
  }>;
}) {
  const { workspaceId } = await props.params;

  // 1. Immediately block malformed UUIDs
  if (!isValidUuid(workspaceId)) {
    notFound();
  }

  // 2. Load authenticated user
  const user = await requireUser();
  if (!user) {
    notFound();
  }

  // 3. Verify user has access to this specific workspace
  const workspace = await getWorkspaceOwnedByUser(workspaceId, user.id);
  if (!workspace) {
    notFound();
  }

  // If secure, render nested content (Personal, Settings, etc.)
  return <>{props.children}</>;
}
