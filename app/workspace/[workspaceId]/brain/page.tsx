import { BrainView } from "../../../../components/brain/brain-view";
import { getBrainStats, getOrCreateBrainSettings, getBrainEntries } from "@/lib/services/brain.service";

export default async function BrainPage(props: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await props.params;

  const [stats, settings, entriesData] = await Promise.all([
    getBrainStats(workspaceId),
    getOrCreateBrainSettings(workspaceId),
    getBrainEntries(workspaceId, 1, 20),
  ]);

  return (
    <BrainView
      workspaceId={workspaceId}
      initialStats={stats}
      initialSettings={settings}
      initialEntries={entriesData.data}
    />
  );
}
