import { redirect } from "next/navigation";
import { requireUser } from "@/lib/services/auth.service";
import { getUserOrganisations } from "@/lib/services/organisation.service";
import { CreateWorkspaceClient } from "./create-workspace-client";

export default async function CreateWorkspacePage() {
  const user = await requireUser();
  const orgs = await getUserOrganisations(user.id);

  return <CreateWorkspaceClient userId={user.id} orgs={orgs} />;
}
