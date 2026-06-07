"use client";

import { useState } from "react";
import { ChevronDown, Building2, Folder, Plus } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";

// ─── Dummy data ──────────────────────────────────────────────────────────

type OrgWorkspace = {
  id: string;
  name: string;
  description: string;
};

type Organization = {
  id: string;
  name: string;
  description: string;
  workspaces: OrgWorkspace[];
};

const DUMMY_ORGS: Organization[] = [
  {
    id: "org-1",
    name: "Acme Corp",
    description:
      "Enterprise workflows and customer automation across product, engineering, and go-to-market teams",
    workspaces: [
      {
        id: "ws-1",
        name: "Engineering",
        description: "CI/CD pipelines and dev tooling",
      },
      {
        id: "ws-2",
        name: "Marketing",
        description: "Campaign automation and analytics",
      },
      {
        id: "ws-3",
        name: "Operations",
        description: "Internal tools and scheduling",
      },
      {
        id: "ws-7",
        name: "Design",
        description: "Design system and prototyping workflows",
      },
    ],
  },
  {
    id: "org-2",
    name: "Side Projects",
    description: "Personal experiments and creative builds",
    workspaces: [
      {
        id: "ws-4",
        name: "Playground",
        description: "Random ideas and prototypes",
      },
    ],
  },
  {
    id: "org-3",
    name: "Freelance Studio",
    description:
      "Client work, contracts, and deliverables across multiple retainer engagements",
    workspaces: [
      {
        id: "ws-8",
        name: "Client A — E-commerce",
        description: "Shopify automation and inventory sync",
      },
      {
        id: "ws-9",
        name: "Client B — SaaS",
        description: "Onboarding flows and churn prediction",
      },
      {
        id: "ws-10",
        name: "Templates & reuse",
        description: "Shared pieces and workflow templates",
      },
    ],
  },
  {
    id: "org-4",
    name: "Open Source Lab",
    description:
      "Community contributions, maintainer tooling, and public roadmap automation",
    workspaces: [
      {
        id: "ws-11",
        name: "Core repo",
        description: "Main project automation and CI",
      },
      {
        id: "ws-12",
        name: "Docs & website",
        description: "Documentation pipelines and deploy previews",
      },
    ],
  },
  {
    id: "org-5",
    name: "Home",
    description:
      "Smart home automations, personal finance tracking, and family scheduling",
    workspaces: [
      {
        id: "ws-13",
        name: "Household",
        description: "IoT routines and grocery planning",
      },
      {
        id: "ws-14",
        name: "Finance",
        description: "Budget tracking and expense reports",
      },
      {
        id: "ws-15",
        name: "Fitness",
        description: "Workout logging and meal prep scheduling",
      },
    ],
  },
];

type StandaloneWorkspace = {
  id: string;
  name: string;
  description: string;
};

const DUMMY_STANDALONE: StandaloneWorkspace[] = [
  {
    id: "ws-5",
    name: "Personal Lab",
    description: "My personal workspace for daily tasks and quick experiments",
  },
  {
    id: "ws-6",
    name: "Client Dashboard",
    description: "Freelance project management and time tracking",
  },
  {
    id: "ws-16",
    name: "Blog automation",
    description: "Content scheduling, cross-posting, and analytics",
  },
  {
    id: "ws-17",
    name: "Learning tracker",
    description: "Course notes, coding exercises, and certification prep",
  },
  {
    id: "ws-18",
    name: "Event planning",
    description: "Conference talks, meetup coordination, and travel logistics",
  },
];

// ─── Cards ───────────────────────────────────────────────────────────────

function OrgCard({ org }: { org: Organization }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 p-5 text-left hover:bg-[var(--hover-bg)] transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[var(--accent)]/15 bg-[var(--accent)]/10 text-[var(--accent)] transition-all group-hover:bg-[var(--accent)] group-hover:text-white group-hover:shadow-[0_0_16px_var(--accent-glow)]">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-[var(--foreground)]">
            {org.name}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)] truncate">
            {org.description}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 mt-1 text-[var(--muted)] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded workspace rows */}
      {expanded && (
        <div className="border-t border-[var(--border)] p-3 pl-12 space-y-1">
          {org.workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/workspace/${ws.id}/personal`}
              className="flex items-center gap-3 rounded px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors"
            >
              <Folder className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--foreground)]">
                  {ws.name}
                </p>
                <p className="text-[12px] text-[var(--muted)] truncate">
                  {ws.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StandaloneCard({ ws }: { ws: StandaloneWorkspace }) {
  return (
    <Link href={`/workspace/${ws.id}/personal`} className="block">
      <Card hoverable className="group cursor-pointer p-5 h-full">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] transition-all group-hover:border-[var(--secondary)]/20 group-hover:bg-[var(--secondary)]/10 group-hover:text-[var(--secondary)] group-hover:shadow-[0_0_16px_var(--secondary-glow)]">
            <Folder className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-medium text-[var(--foreground)]">
              {ws.name}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)] truncate">
              {ws.description}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────

export default function OrgPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b border-[var(--border)] bg-[var(--sidebar-bg)]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/op-not-moving.png"
              alt="OpenPieces"
              className="h-7 w-7 rounded object-cover"
            />
            <span className="text-sm font-semibold text-[var(--foreground)]">
              openpieces
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-12">
        {/* Heading — minimal */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Organizations &amp; workspaces
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              Choose where you want to work.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] transition-colors"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
          </div>
        </div>

        {/* Organizations */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-[var(--muted)]" />
            <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Organizations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {DUMMY_ORGS.map((org) => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
        </section>

        {/* Standalone workspaces */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Folder className="h-3.5 w-3.5 text-[var(--muted)]" />
            <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Standalone workspaces
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {DUMMY_STANDALONE.map((ws) => (
              <StandaloneCard key={ws.id} ws={ws} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
