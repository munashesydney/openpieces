import { redirect } from "next/navigation";
import { requireUser } from "../lib/services/auth.service";
import { getDefaultWorkspace } from "../lib/services/workspace.service";

export default async function Home() {
  const user = await requireUser();
  const workspace = await getDefaultWorkspace(user.id);

  if (workspace) {
    redirect(`/workspace/${workspace.id}/personal`);
  }

  // Fallback in case a user exists without a workspace
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--muted)]">
      No workspace found. Please contact support.
    </div>
  );
}
