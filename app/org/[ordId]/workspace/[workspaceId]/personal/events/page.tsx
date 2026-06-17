import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MainArea } from "@/components/layout/main-area";
import { EventsPage } from "@/components/events/events-page";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getEvents } from "@/lib/services/event.service";
import { getSubscriptionCountsByEvent } from "@/lib/services/event.service";

export default async function EventsRoute(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;
  const { user } = await requireWorkspaceOwner(workspaceId);
  const { data: events } = await getEvents(workspaceId, 1, 100);
  const subscriptionCounts = await getSubscriptionCountsByEvent(workspaceId);

  return (
    <DashboardLayout>
      <MainArea>
        <EventsPage
          initialEvents={events}
          subscriptionCounts={subscriptionCounts}
          workspaceId={workspaceId}
        />
      </MainArea>
    </DashboardLayout>
  );
}
