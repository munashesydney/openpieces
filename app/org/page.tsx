import { requireUser } from "@/lib/services/auth.service";
import {
  getUserOrganisations,
  getStandaloneWorkspaces,
} from "@/lib/services/organisation.service";
import { getWorkspacesByOrgIds } from "@/lib/services/organisation.service";
import { OrgPageClient } from "./org-page-client";

export default async function OrgPage() {
  const user = await requireUser();
  const organisations = await getUserOrganisations(user.id);
  const standaloneWorkspaces = await getStandaloneWorkspaces(user.id);

  // Fetch workspaces for all orgs
  const orgIds = organisations.map((o) => o.id);
  const workspaceMap =
    orgIds.length > 0 ? await getWorkspacesByOrgIds(orgIds) : new Map();

  return (
    <OrgPageClient
      organisations={organisations}
      standaloneWorkspaces={standaloneWorkspaces}
      workspaceMap={workspaceMap}
    />
  );
}
