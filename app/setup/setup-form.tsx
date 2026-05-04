"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LocateFixed } from "lucide-react";
import { AuthLayout } from "../../components/layout/auth-layout";
import { Input } from "../../components/basic/input/input";
import { Button } from "../../components/basic/buttons/button";
import { Dropdown } from "../../components/basic/input/dropdown";
import { COMMON_TIMEZONES } from "../../lib/utils/timezones";

const timezoneOptions = COMMON_TIMEZONES.map((tz) => ({
  label: tz.replace(/_/g, " "),
  value: tz,
}));

interface StepProps {
  form: {
    name: string;
    email: string;
    password: string;
    workspaceName: string;
    timezone: string;
    agentName: string;
    userNickname: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      password: string;
      workspaceName: string;
      timezone: string;
      agentName: string;
      userNickname: string;
    }>
  >;
  onNext?: () => void;
  onBack?: () => void;
}

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

function StepAccount({ form, setForm, onNext }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    if (!form.password) newErrors.password = "Password is required";
    else if (form.password.length < 8)
      newErrors.password = "At least 8 characters";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onNext?.();
  };

  return (
    <div className="space-y-4">
      <Input
        label="Name"
        type="text"
        required
        autoFocus
        autoComplete="name"
        placeholder="Your name"
        value={form.name}
        error={errors.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <Input
        label="Email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={form.email}
        error={errors.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <Input
        label="Password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Min. 8 characters"
        value={form.password}
        error={errors.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <Button
        type="button"
        onClick={handleNext}
        size="lg"
        className="mt-2 w-full"
      >
        Continue
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StepWorkspace({ form, setForm, onNext, onBack }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detectTimezone = () => {
    if (typeof window !== "undefined") {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setForm({ ...form, timezone: detected });
    }
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    if (!form.workspaceName.trim())
      newErrors.workspaceName = "Workspace name is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onNext?.();
  };

  return (
    <div className="space-y-4">
      <Input
        label="Workspace name"
        type="text"
        required
        autoFocus
        placeholder="e.g. Acme Corp"
        value={form.workspaceName}
        error={errors.workspaceName}
        onChange={(e) => setForm({ ...form, workspaceName: e.target.value })}
      />

      <Dropdown
        label="Timezone"
        options={timezoneOptions}
        value={form.timezone}
        onChange={(val) => setForm({ ...form, timezone: val })}
        placeholder="Select a timezone"
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={detectTimezone}
        >
          <LocateFixed className="h-3.5 w-3.5" />
          Detect my timezone
        </Button>
        {form.timezone && (
          <span className="text-xs text-[var(--muted)]">
            Current: {form.timezone.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onBack}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="button" onClick={handleNext} size="lg" className="flex-1">
          Continue
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepAgent({ form, setForm, onNext, onBack }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    if (!form.agentName.trim()) newErrors.agentName = "Agent name is required";
    if (!form.userNickname.trim())
      newErrors.userNickname = "A name for yourself is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onNext?.();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          Your AI agent is how you&apos;ll interact with openpieces. Give it a
          personality that suits you.
        </p>
      </div>

      <Input
        label="Agent name"
        type="text"
        required
        autoFocus
        placeholder="e.g. Zoe, Orion, Nova..."
        value={form.agentName}
        error={errors.agentName}
        onChange={(e) => setForm({ ...form, agentName: e.target.value })}
      />
      <Input
        label="What should it call you?"
        type="text"
        required
        placeholder="e.g. Boss, Captain, Alex..."
        value={form.userNickname}
        error={errors.userNickname}
        onChange={(e) => setForm({ ...form, userNickname: e.target.value })}
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onBack}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="button" onClick={handleNext} size="lg" className="flex-1">
          Review
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepReview({
  form,
  onBack,
  onSubmit,
  loading,
}: {
  form: StepProps["form"];
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 backdrop-blur-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          Account
        </h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Name</span>
            <span className="text-[var(--foreground)]">{form.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Email</span>
            <span className="text-[var(--foreground)]">{form.email}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 backdrop-blur-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          Workspace
        </h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Name</span>
            <span className="text-[var(--foreground)]">
              {form.workspaceName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Timezone</span>
            <span className="text-[var(--foreground)]">
              {form.timezone.replace(/_/g, " ")}
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
            <span className="text-[var(--foreground)]">{form.agentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Calls you</span>
            <span className="text-[var(--foreground)]">
              {form.userNickname}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onBack}
          className="flex-1"
          disabled={loading}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          size="lg"
          isLoading={loading}
          className="flex-1"
        >
          {loading ? "Setting up..." : "Launch openpieces"}
        </Button>
      </div>
    </div>
  );
}

export default function SetupForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    workspaceName: "",
    timezone: "UTC",
    agentName: "Assistant",
    userNickname: "User",
  });

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.status === 409) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Please log in.");
        router.replace("/login");
        return;
      }

      router.replace("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Get started"
      subtitle="Set up your openpieces instance in just a few steps."
    >
      <StepIndicator current={step} />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 backdrop-blur-sm"
      >
        {step === 0 && (
          <StepAccount
            form={form}
            setForm={setForm}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepWorkspace
            form={form}
            setForm={setForm}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepAgent
            form={form}
            setForm={setForm}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepReview
            form={form}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
            loading={loading}
          />
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
