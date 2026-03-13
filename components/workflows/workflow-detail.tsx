"use client";

import { ChevronLeft, Zap, Terminal, Sparkles, ArrowRight, Play, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  serviceId?: string;
  serviceName?: string;
  type: "trigger" | "action" | "logic";
}

const MOCK_WORKFLOW_DETAIL = {
  id: "1",
  title: "Post-Purchase Automation",
  description: "AI-generated plan to handle customer onboarding and feedback after a Stripe payment.",
  steps: [
    {
      id: "s1",
      title: "Stripe Webhook Receiver",
      description: "Listens for checkout.session.completed events.",
      serviceName: "Stripe Webhook",
      type: "trigger",
    },
    {
      id: "s2",
      title: "Customer Data Enrichment",
      description: "Fetch additional customer details from Zoho.",
      serviceName: "Zoho Contact Creator",
      type: "action",
    },
    {
      id: "s3",
      title: "Team Notification",
      description: "Post a message to #sales channel in Slack.",
      serviceName: "Slack Notification",
      type: "action",
    },
  ] as WorkflowStep[],
};

export function WorkflowDetail() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const workflow = MOCK_WORKFLOW_DETAIL; // In real app, fetch by id

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
            Back to Workflows
          </button>
          
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                {workflow.title}
              </h1>
              <p className="text-sm text-[var(--muted)]">
                {workflow.description}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
              <Button className="gap-2">
                <Play className="h-4 w-4 fill-current" />
                Run Workflow
              </Button>
            </div>
          </div>
        </div>

        {/* AI Plan Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">The AI Plan</h2>
          </div>

          <div className="relative space-y-4 before:absolute before:bottom-0 before:left-4 before:top-4 before:w-px before:bg-[var(--border)]">
            {workflow.steps.map((step, index) => (
              <div key={step.id} className="relative pl-10">
                <div className={`absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[var(--background)] ring-1 ring-[var(--border)] ${
                  step.type === "trigger" ? "bg-amber-500 text-white" : "bg-[var(--accent)] text-white"
                }`}>
                  {step.type === "trigger" ? <Zap className="h-3.5 w-3.5 fill-current" /> : <Terminal className="h-3.5 w-3.5" />}
                </div>
                
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                         <h3 className="text-base font-semibold text-[var(--foreground)]">{step.title}</h3>
                         <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Step {index + 1}</span>
                      </div>
                      <p className="text-sm text-[var(--muted)] leading-relaxed">
                        {step.description}
                      </p>
                      
                      {step.serviceName && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--hover-bg)] p-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                             step.type === "trigger" ? "text-amber-500 bg-amber-500/10" : "text-[var(--accent)] bg-[var(--accent-glow)]/10"
                          }`}>
                            {step.type === "trigger" ? <Zap className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
                          </div>
                          <div className="flex flex-1 items-center justify-between text-xs">
                            <span className="font-medium text-[var(--foreground)]">{step.serviceName}</span>
                            <span className="text-[var(--muted)] italic">Associated Service</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
