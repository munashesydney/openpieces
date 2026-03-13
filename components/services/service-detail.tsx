"use client";

import { ChevronLeft, Activity, Code, Clock, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
}

interface ServiceDetailProps {
  id: string;
  workspaceId: string;
}

const MOCK_ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/v1/status", description: "Get the current availability of the cluster." },
  { method: "POST", path: "/v1/compute", description: "Submit a new training job to the GPU cluster." },
  { method: "GET", path: "/v1/jobs/:id", description: "Retrieve detailed metrics for a specific job." },
  { method: "DELETE", path: "/v1/jobs/:id", description: "Terminate a running compute session." },
];

export function ServiceDetail({ id, workspaceId }: ServiceDetailProps) {
  const router = useRouter();
  // Mock data normalized from the ID
  const title = id ? id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Service";

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10 font-Inter">
      <div className="w-full max-w-[820px] space-y-10">
        {/* Navigation & Header */}
        <div className="space-y-6">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Services
          </button>
          
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                {title}
              </h1>
              <p className="text-sm text-[var(--muted)]">
                Service Details & API Reference
              </p>
            </div>
          </div>
        </div>

        {/* Top Stats/Status */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--muted)]">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Status</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">Operational</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--muted)]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Uptime</p>
                <span className="text-sm font-semibold text-[var(--foreground)]">99.98%</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--muted)]">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Avg Latency</p>
                <span className="text-sm font-semibold text-[var(--foreground)]">42ms</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Endpoints Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-[var(--muted)]" />
              <CardTitle>API Endpoints</CardTitle>
            </div>
            <CardDescription>Available routes and methods for this service.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--border)]">
              {MOCK_ENDPOINTS.map((endpoint, i) => (
                <div key={i} className="group flex flex-col gap-2 py-6 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wider ${
                      endpoint.method === 'GET' ? 'border-emerald-500/20 text-emerald-500' :
                      endpoint.method === 'POST' ? 'border-blue-500/20 text-blue-500' :
                      endpoint.method === 'DELETE' ? 'border-red-500/20 text-red-500' : 
                      'border-amber-500/20 text-amber-500'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-[var(--foreground)] opacity-80">{endpoint.path}</code>
                  </div>
                  <p className="text-sm text-[var(--muted)]">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security / Compliance Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--muted)]" />
              <CardTitle>Security & Compliance</CardTitle>
            </div>
            <CardDescription>All endpoints are secured via JWT and Rate Limited.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">TLS 1.3 Active</div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">SOC2 Compliant</div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">AES-256 Encryption</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
