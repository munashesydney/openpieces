"use server";

import { ActivityView } from "@/components/brain/activity-view";
import { getActivityByTypeAction } from "../actions";

export default async function ActivityPage(props: {
  params: Promise<{ ordId: string; workspaceId: string }>;
}) {
  const { ordId, workspaceId } = await props.params;

  const getActivity = getActivityByTypeAction.bind(null, workspaceId);

  return (
    <ActivityView
      orgId={ordId}
      workspaceId={workspaceId}
      getActivityAction={getActivity}
    />
  );
}
