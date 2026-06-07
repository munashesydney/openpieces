"use server";

import { ActivityView } from "@/components/brain/activity-view";
import { getActivityByTypeAction } from "../actions";

export default async function ActivityPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;

  const getActivity = getActivityByTypeAction.bind(null, workspaceId);

  return (
    <ActivityView workspaceId={workspaceId} getActivityAction={getActivity} />
  );
}
