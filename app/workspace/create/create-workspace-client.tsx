"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Input } from "@/components/basic/input/input";
import { Button } from "@/components/basic/buttons/button";
import { Dropdown } from "@/components/basic/input/dropdown";
import { createWorkspaceAction } from "./actions";
import { COMMON_TIMEZONES } from "@/lib/utils/timezones";

const timezoneOptions = COMMON_TIMEZONES.map((tz) => ({
  label: tz.replace(/_/g, " "),
  value: tz,
}));

const STEP_COUNT = 4;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-start gap-[3px]">
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <div key={i} className="flex items-center gap-[3px]">
          <div
            className={`rounded-full transition-all duration-500 ease-out ${
              i <= current ? "bg-[var(--accent)]" : "bg-[var(--border)]"
            } ${
              i === current
                ? "h-2.5 w-6 shadow-sm shadow-[var(--accent-glow)]"
                : "h-2 w-2"
            }`}
          />
          {i < STEP_COUNT - 1 && (
            <div
              className={`h-px w-4 transition-all duration-500 delay-150 ${
                i < current ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

type CreateWorkspaceClientProps = {
  userId: string;
};

export function CreateWorkspaceClient({
  userId: _userId,
}: CreateWorkspaceClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(() => {
    if (typeof window !== "undefined") {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return "UTC";
  });
  const [agentName, setAgentName] = useState("Assistant");
  const [userNickname, setUserNickname] = useState("User");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setFormError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("timezone", timezone);
    formData.set("agentName", agentName);
    formData.set("userNickname", userNickname);

    startTransition(async () => {
      const result = await createWorkspaceAction(formData);
      if ("error" in result) {
        setFormError(result.error);
      }
    });
  };

  return (
    <AuthLayout
      title="New Workspace"
      subtitle="Organize your projects. Customize your space."
      onBack={() => router.back()}
    >
      <StepIndicator current={step} />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 backdrop-blur-sm"
      >
        {/* Step 1 — Workspace */}
        {step === 0 && (
          <div className="space-y-4">
            <Input
              label="Workspace name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                Description{" "}
                <span className="text-[var(--muted)]">(Optional)</span>
              </label>
              <textarea
                placeholder="Tell us about this workspace..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--muted)] resize-none"
              />
            </div>
            <Button
              type="button"
              onClick={() => setStep(1)}
              size="lg"
              className="mt-2 w-full"
              disabled={!name}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2 — Timezone */}
        {step === 1 && (
          <div className="space-y-4">
            <Dropdown
              label="Timezone"
              options={timezoneOptions}
              value={timezone}
              onChange={setTimezone}
              placeholder="Select a timezone"
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setStep(0)}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                size="lg"
                className="flex-1"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Agent */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Set how your AI agent presents itself in this workspace.
              </p>
            </div>
            <Input
              label="Agent name"
              type="text"
              autoFocus
              placeholder="e.g. Zoe, Orion, Nova..."
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
            <Input
              label="What should it call you?"
              type="text"
              placeholder="e.g. Boss, Captain, Alex..."
              value={userNickname}
              onChange={(e) => setUserNickname(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                size="lg"
                className="flex-1"
              >
                Review
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                Workspace
              </h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Name</span>
                  <span className="text-[var(--foreground)]">{name}</span>
                </div>
                {description && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Description</span>
                    <span className="text-[var(--foreground)] text-right max-w-[200px] truncate">
                      {description}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Timezone</span>
                  <span className="text-[var(--foreground)]">
                    {timezone.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                AI Agent
              </h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Agent name</span>
                  <span className="text-[var(--foreground)]">{agentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Calls you</span>
                  <span className="text-[var(--foreground)]">
                    {userNickname}
                  </span>
                </div>
              </div>
            </div>

            {formError && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {formError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setStep(2)}
                className="flex-1"
                disabled={isPending}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                size="lg"
                isLoading={isPending}
                className="flex-1"
              >
                {isPending ? "Creating..." : "Create Workspace"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
