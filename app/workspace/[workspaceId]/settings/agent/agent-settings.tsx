"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";
import { updateAgentSettingsAction } from "./actions";

type AgentSettingsProps = {
  workspaceId: string;
  initialAgentName: string;
  initialUserNickname: string;
  initialChatLimit: number;
};

export function AgentSettings({
  workspaceId,
  initialAgentName,
  initialUserNickname,
  initialChatLimit,
}: AgentSettingsProps) {
  const [agentName, setAgentName] = useState(initialAgentName);
  const [userNickname, setUserNickname] = useState(initialUserNickname);
  const [chatLimit, setChatLimit] = useState(initialChatLimit);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData();
    formData.set("agentName", agentName);
    formData.set("userNickname", userNickname);
    formData.set("chatLimit", String(chatLimit));

    startTransition(async () => {
      const result = await updateAgentSettingsAction(workspaceId, formData);
      if ("error" in result) {
        setFormError(result.error);
      }
    });
  };

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>AI Agent Identity</CardTitle>
            <CardDescription>
              Customize how your AI agent presents itself and how it addresses
              you within this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  These names are used across all AI interactions in this
                  workspace — in chat, system prompts, and agent responses.
                </p>
              </div>

              <Input
                label="Agent name"
                placeholder="e.g. Zoe, Orion, Nova..."
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required
              />

              <Input
                label="What should it call you?"
                placeholder="e.g. Boss, Captain, Alex..."
                value={userNickname}
                onChange={(e) => setUserNickname(e.target.value)}
                required
              />

              <Input
                type="number"
                label="Max chats per day"
                min={0}
                value={chatLimit}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setChatLimit(isNaN(v) ? 0 : v);
                }}
              />

              {formError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setAgentName(initialAgentName);
                    setUserNickname(initialUserNickname);
                    setChatLimit(initialChatLimit);
                  }}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How names are used</CardTitle>
            <CardDescription>
              Understanding when these names appear.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs text-[var(--accent)]">
                  1
                </span>
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    System prompts
                  </p>
                  <p className="text-[var(--muted)]">
                    Every AI agent receives your workspace context, including
                    the agent name and what it should call you.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs text-[var(--accent)]">
                  2
                </span>
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Chat interactions
                  </p>
                  <p className="text-[var(--muted)]">
                    The agent will refer to itself by its name and address you
                    by the name you chose.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs text-[var(--accent)]">
                  3
                </span>
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Runtime events
                  </p>
                  <p className="text-[var(--muted)]">
                    Events and workflow executions reference these names in
                    notifications and summaries.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
