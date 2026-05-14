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
    <div className="flex w-full px-6 pb-20">
      <div className="w-full px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      setAgentName("Assistant");
                      setUserNickname("User");
                      setChatLimit(100);
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
        </div>
      </div>
    </div>
  );
}
