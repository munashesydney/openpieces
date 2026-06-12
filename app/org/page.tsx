import { requireUser } from "@/lib/services/auth.service";
import {
  getUserOrganisations,
  getStandaloneWorkspaces,
  getWorkspacesByOrgIds,
} from "@/lib/services/organisation.service";
import { OrgPageClient } from "./org-page-client";

export default async function OrgPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const showDeactivated = searchParams?.deactivated === "1";

  const user = await requireUser();
  const organisations = await getUserOrganisations(user.id);
  const standaloneWorkspaces = await getStandaloneWorkspaces(
    user.id,
    showDeactivated,
  );

  const orgIds = organisations.map((o) => o.id);
  const workspaceMap =
    orgIds.length > 0
      ? await getWorkspacesByOrgIds(orgIds, showDeactivated)
      : new Map();

  return (
    <OrgPageClient
      organisations={organisations}
      standaloneWorkspaces={standaloneWorkspaces}
      workspaceMap={workspaceMap}
      showDeactivated={showDeactivated}
    />
  );
}
