import { getActivityLogs } from "../../../../../lib/services/activity.service";
import { ActivityView } from "../../../../../components/brain/activity-view";
import { requireWorkspaceOwner } from "../../../../../lib/services/auth.service";

export default async function ActivityPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  await requireWorkspaceOwner(workspaceId);

  // Fetch initial workflow activity (first 50)
  const initialActivity = await getActivityLogs(workspaceId, "workflow");

  return <ActivityView workspaceId={workspaceId} initialActivity={initialActivity} />;
}
