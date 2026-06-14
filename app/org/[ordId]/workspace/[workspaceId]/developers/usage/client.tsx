"use client";

import { useEffect, useState, useTransition } from "react";
import { getUsageDataAction } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/basic/buttons/button";
import { LineChart, RefreshCw, AlertCircle } from "lucide-react";

export function UsageClient({ workspaceId, ordId }: { workspaceId: string, ordId: string }) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<{ metrics: any, records: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    startTransition(async () => {
      setError(null);
      const res = await getUsageDataAction(workspaceId);
      if (res.error) {
        setError(res.error);
      } else if (res.metrics && res.records) {
        setData({ metrics: res.metrics, records: res.records });
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const metrics = data?.metrics;
  const records = data?.records || [];

  return (
    <div className="flex w-full px-6 pb-20 pt-8">
      <div className="w-full px-4 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">
              Developer
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <LineChart size={24} /> AI Usage
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              Monitor AI cost, tokens, and billing across OpenPieces features.
            </p>
          </div>
          <Button
            variant="outline"
            size="md"
            className="mt-8 flex items-center gap-1.5"
            onClick={loadData}
            disabled={isPending}
          >
            <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        {error && (
           <div className="rounded border border-red-500/30 bg-red-500/10 p-4 text-[13px] text-red-400 flex items-center gap-2">
             <AlertCircle size={16} />
             {error}
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden">
            <CardContent className="p-5">
              <div className="text-[12px] font-medium text-[var(--muted)]">Total Cost</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-emerald-400">
                  ${metrics?.totalCost?.toFixed(4) ?? "0.0000"}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden">
            <CardContent className="p-5">
              <div className="text-[12px] font-medium text-[var(--muted)]">Total Tokens</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                  {(metrics?.totalTokens ?? 0).toLocaleString()}
                </span>
                <span className="text-[11px] text-[var(--muted)]">tokens used</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden">
            <CardContent className="p-5">
              <div className="text-[12px] font-medium text-[var(--muted)]">Active Agents</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                  {metrics?.byAgent?.length ?? 0}
                </span>
                <span className="text-[11px] text-[var(--muted)]">services billed</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {metrics?.byAgent && metrics.byAgent.length > 0 && (
          <div className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)] p-5">
            <h3 className="text-[13px] font-medium text-[var(--foreground)] mb-4">Cost by Agent</h3>
            <div className="space-y-4">
              {metrics.byAgent.map((agent: any) => (
                <div key={agent.agentType}>
                   <div className="flex justify-between text-[12px] mb-1">
                      <span className="capitalize text-[var(--foreground)]">{agent.agentType.replace("_", " ")}</span>
                      <span className="font-mono text-[var(--muted)]">${(agent.cost || 0).toFixed(6)}</span>
                   </div>
                   <div className="w-full bg-[var(--hover-bg)] rounded h-1.5 overflow-hidden">
                     <div className="bg-[var(--accent)] h-full" style={{ width: `${Math.max(1, ((agent.cost || 0) / (metrics.totalCost || 1)) * 100)}%` }} />
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
             <h3 className="text-[13px] font-medium text-[var(--foreground)]">Recent Usage Records</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
             {records.length === 0 ? (
               <div className="py-10 text-center text-[13px] text-[var(--muted)]">No usage records found.</div>
             ) : (
               records.map((record: any) => (
                 <div key={record.id} className="p-4 flex items-center justify-between hover:bg-[var(--hover-bg)] transition-colors">
                    <div>
                      <div className="text-[13px] font-medium text-[var(--foreground)] flex items-center gap-2">
                         <span className="capitalize">{record.agentType.replace("_", " ")}</span>
                         <span className="text-[10px] text-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">{record.model}</span>
                      </div>
                      <div className="text-[11px] text-[var(--muted)] mt-1 flex gap-3">
                         <span>{new Date(record.createdAt).toLocaleString()}</span>
                         <span>Tokens: {record.totalTokens} ({record.promptTokens} in / {record.completionTokens} out)</span>
                         {record.chatId && (
                           <a href={`/org/${ordId}/workspace/${workspaceId}/brain?chat=${record.chatId}`} className="text-[var(--accent)] hover:underline">
                             View Chat
                           </a>
                         )}
                         {record.opencodeSessionId && (
                           <span className="text-[var(--accent)]">OpenCode Session</span>
                         )}
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[13px] font-mono font-medium text-emerald-400">
                         +${(record.cost || 0).toFixed(6)}
                       </div>
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
