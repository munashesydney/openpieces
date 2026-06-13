"use client";

import { Button } from "@/components/basic/buttons/button";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/basic/input/input";

interface ApiKeyCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  action: (formData: FormData) => void;
  formError: string | null;
  isPending: boolean;
}

export function ApiKeyCreateSheet({
  isOpen,
  onClose,
  action,
  formError,
  isPending,
}: ApiKeyCreateSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Create API Key"
      description="Create a new API key to authenticate requests to this workspace."
      footer={<></>}
    >
      <form action={action} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Key Name"
            name="name"
            placeholder="e.g. Production, CI/CD, Mobile App"
            autoFocus
            required
          />
        </div>

        {formError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {formError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            isLoading={isPending}
          >
            Generate Key
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
