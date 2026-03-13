"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { ChevronLeft, ChevronRight, Plus, Zap, Cpu, Terminal, MoreHorizontal } from "lucide-react";
import { Sheet } from "../ui/sheet";
import { Input } from "@/components/basic/input/input";
import { Textarea } from "@/components/basic/input/textarea";
import { Dropdown } from "@/components/basic/input/dropdown";

interface Service {
  id: string;
  title: string;
  description: string;
  type: "trigger" | "action";
}

const services: Service[] = [
  {
    id: "1",
    title: "Stripe Webhook",
    description: "Listen for successful payments to trigger accounting workflows.",
    type: "trigger",
  },
  {
    id: "2",
    title: "Zoho Contact Creator",
    description: "Automatically create new contacts in Zoho CRM from integrated leads.",
    type: "action",
  },
  {
    id: "3",
    title: "Telegram Message",
    description: "Trigger on new incoming messages to specific bot channels.",
    type: "trigger",
  },
  {
    id: "4",
    title: "Notion Page Creator",
    description: "Generate new database entries or pages in Notion workspaces.",
    type: "action",
  },
  {
    id: "5",
    title: "GitHub Webhook",
    description: "Trigger on repository events like pushes, PRs, or new issues.",
    type: "trigger",
  },
  {
    id: "6",
    title: "Slack Notification",
    description: "Post automated updates or rich messages to designated channels.",
    type: "action",
  },
];

export function ServicesList() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newServiceType, setNewServiceType] = useState("trigger");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const workspaceId = segments[1];

  const triggers = services.filter((s) => s.type === "trigger");
  const actions = services.filter((s) => s.type === "action");

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-10">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Services</h1>
            <p className="text-sm text-[var(--muted)]">Manage and deploy AI-generated services within your workspace.</p>
          </div>
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="h-4 w-4" />
            New Service
          </Button>
        </div>

        {/* New Service Sheet */}
        <Sheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Create New Service"
          description="Define a new trigger or action for your workspace."
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsSheetOpen(false)}>Create Service</Button>
            </div>
          }
        >
          <div className="space-y-6">
            <Input
              label="Service Title"
              placeholder="e.g. Stripe Webhook"
            />
            <Dropdown
              label="Service Type"
              value={newServiceType}
              onChange={setNewServiceType}
              options={[
                { label: "Trigger (Event Source)", value: "trigger" },
                { label: "Action (Endpoint)", value: "action" },
              ]}
            />
            <Dropdown
              label={newServiceType === "trigger" ? "Associated Workflow (Required)" : "Associated Workflow (Optional)"}
              value={selectedWorkflow}
              onChange={setSelectedWorkflow}
              options={[
                { label: "Select a workflow...", value: "" },
                { label: "Post-Purchase Automation", value: "1" },
                { label: "Lead Nurturing Sequence", value: "2" },
                { label: "Technical Support Router", value: "3" },
              ]}
            />
            <Textarea
              label="Description"
              placeholder="What should this service do?"
            />
          </div>
        </Sheet>

        {/* Triggers Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Triggers</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {triggers.map((service) => (
              <ServiceCard key={service.id} service={service} workspaceId={workspaceId} />
            ))}
          </div>
        </section>

        {/* Actions Section */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 px-1">
            <Terminal className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Actions</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {actions.map((service) => (
              <ServiceCard key={service.id} service={service} workspaceId={workspaceId} />
            ))}
          </div>
        </section>

        {/* Pagination UI */}
        <div className="mt-8 flex items-center justify-between px-2">
          <div className="text-sm text-[var(--muted)]">
            Showing <span className="font-medium text-[var(--foreground)]">1</span> to <span className="font-medium text-[var(--foreground)]">8</span> of <span className="font-medium text-[var(--foreground)]">24</span> services
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              {[1, 2, 3].map((page) => (
                <Button
                  key={page}
                  variant={page === 1 ? "primary" : "outline"}
                  size="icon"
                  className="text-sm"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ service, workspaceId }: { service: Service; workspaceId: string }) {
  const slug = service.title.toLowerCase().replace(/\s+/g, "-");
  const Icon = service.type === "trigger" ? Zap : Terminal;
  const iconColor = service.type === "trigger" ? "text-amber-500" : "text-[var(--accent)]";

  return (
    <Link href={`/workspace/${workspaceId}/personal/services/${slug}`}>
      <Card hoverable className="group cursor-pointer p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 items-start gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hover-bg)] ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-[var(--foreground)]">{service.title}</h3>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  {service.type}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{service.description}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase text-emerald-500">Operational</span>
                <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                <span className="text-[10px] font-medium uppercase text-[var(--muted)]">Last sync 2m ago</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="-mt-1">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    </Link>
  );
}
