import { redirect } from "next/navigation";
import { requireUser } from "@/lib/services/auth.service";
import { CreateWorkspaceClient } from "./create-workspace-client";

export default async function CreateWorkspacePage() {
  const user = await requireUser();

  return <CreateWorkspaceClient userId={user.id} />;
}