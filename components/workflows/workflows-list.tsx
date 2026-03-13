"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { Plus, Workflow, ChevronRight, Sparkles, Clock } from "lucide-react";

export interface WorkflowPlan {
  id: string;
  title: string;
  description: string;
  status: "active" | "draft" | "completed";
  updatedAt: string;
  servicesCount: number;
}

const MOCK_WORKFLOWS: WorkflowPlan[] = [
  {
    id: "1",
    title: "Post-Purchase Automation",
    description: "AI-generated plan to handle customer onboarding and feedback after a Stripe payment.",
    status: "active",
    updatedAt: "2 hours ago",
    servicesCount: 3,
  },
  {
    id: "2",
    title: "Lead Nurturing Sequence",
    description: "Strategic sequence for syncing Zoho leads and initiating Slack alerts.",
    status: "active",
    updatedAt: "5 hours ago",
    servicesCount: 2,
  },
  {
    id: "3",
    title: "Technical Support Router",
    description: "Automated routing of GitHub issues to appropriate Discord channels.",
    status: "draft",
    updatedAt: "1 day ago",
    servicesCount: 4,
  },
];

export function WorkflowsList() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const workspaceId = segments[1];

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-10">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Workflows</h1>
            <p className="text-sm text-[var(--muted)]">Manage your AI-generated automation plans.</p>
          </div>
          <Button>
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {MOCK_WORKFLOWS.map((workflow) => (
            <Link key={workflow.id} href={`/workspace/${workspaceId}/personal/workflows/${workflow.id}`}>
              <Card hoverable className="group cursor-pointer p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-white">
                      <Workflow className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-medium text-[var(--foreground)]">{workflow.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          workflow.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-[var(--border)] text-[var(--muted)]"
                        }`}>
                          {workflow.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2 max-w-[600px]">
                        {workflow.description}
                      </p>
                      
                      <div className="mt-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-tight text-[var(--muted)]">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{workflow.servicesCount} Services</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Updated {workflow.updatedAt}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 -mt-1 items-center justify-center rounded-full text-[var(--muted)] transition-all group-hover:bg-[var(--hover-bg)] group-hover:text-[var(--foreground)] group-hover:translate-x-1">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
