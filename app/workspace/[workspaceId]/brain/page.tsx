import { BrainView } from "../../../../components/brain/brain-view";
import { getBrainStats, getOrCreateBrainSettings, getBrainEntries } from "@/lib/services/brain.service";

export default async function BrainPage(props: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { workspaceId } = await props.params;
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page ?? 1);
  const pageSize = 20;

  const [stats, settings, entriesData] = await Promise.all([
    getBrainStats(workspaceId),
    getOrCreateBrainSettings(workspaceId),
    getBrainEntries(workspaceId, currentPage, pageSize),
  ]);

  return (
    <BrainView
      workspaceId={workspaceId}
      initialStats={stats}
      initialSettings={settings}
      initialEntries={entriesData.data}
      totalEntries={entriesData.total}
      currentPage={currentPage}
      pageSize={pageSize}
    />
  );
}
