"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/basic/buttons/button";
import { createWorkspaceAction } from "./actions";

type CreateWorkspaceClientProps = {
  userId: string;
};

export function CreateWorkspaceClient({ userId: _userId }: CreateWorkspaceClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);

    startTransition(async () => {
      const result = await createWorkspaceAction(formData);
      if ("error" in result) {
        setFormError(result.error);
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Create Workspace
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Set up a new workspace to organize your projects.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 backdrop-blur-sm"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-medium text-[var(--muted)]"
              >
                Workspace Name
              </label>
              <input
                id="name"
                type="text"
                required
                autoFocus
                placeholder="e.g. Acme Corporation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-xs font-medium text-[var(--muted)]"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                placeholder="Tell us about this workspace..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors resize-none"
              />
            </div>
          </div>

          {formError && (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {formError}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isPending}
              disabled={!name}
              className="flex-1"
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}