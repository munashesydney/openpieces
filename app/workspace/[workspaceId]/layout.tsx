import { notFound } from "next/navigation";
import { requireWorkspaceOwner } from "../../../lib/services/auth.service";

export default async function WorkspaceLayout(props: {
  children: React.ReactNode;
  params: Promise<{
    workspaceId: string;
  }>;
}) {
  const { workspaceId } = await props.params;
  await requireWorkspaceOwner(workspaceId);

  // If secure, render nested content (Personal, Settings, etc.)
  return <>{props.children}</>;
}
