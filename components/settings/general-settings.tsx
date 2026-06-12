"use client";

import { useState, useTransition } from "react";
import { LocateFixed, AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";
import { Textarea } from "@/components/basic/input/textarea";
import { Dropdown } from "@/components/basic/input/dropdown";
import { Modal } from "../ui/modal";
import type { DropdownOption } from "@/components/basic/input/dropdown";
import {
  updateGeneralSettingsAction,
  deactivateWorkspaceAction,
} from "@/app/org/[ordId]/workspace/[workspaceId]/settings/general/actions";
import { COMMON_TIMEZONES } from "@/lib/utils/timezones";

type GeneralSettingsProps = {
  workspaceId: string;
  initialName: string;
  initialDescription: string;
  initialTimezone: string;
  isDeactivated: boolean;
};

const timezoneOptions: DropdownOption[] = COMMON_TIMEZONES.map((tz) => ({
  label: tz.replace(/_/g, " "),
  value: tz,
}));

export function GeneralSettings({
  workspaceId,
  initialName,
  initialDescription,
  initialTimezone,
  isDeactivated,
}: GeneralSettingsProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const detectTimezone = () => {
    if (typeof window !== "undefined") {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detected);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("timezone", timezone);

    startTransition(async () => {
      const result = await updateGeneralSettingsAction(workspaceId, formData);
      if ("error" in result) {
        setFormError(result.error);
      }
    });
  };

  const handleDeactivate = () => {
    setIsDeactivateModalOpen(false);
    setIsDeactivating(true);
    setDeactivateError(null);
    startTransition(async () => {
      const result = await deactivateWorkspaceAction(workspaceId);
      if ("error" in result) {
        setDeactivateError(result.error);
        setIsDeactivating(false);
      }
    });
  };

  return (
    <div className="flex w-full px-6 pb-20 pt-8">
      <div className="w-full px-4">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">
            Configuration
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            General Settings
          </h1>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Manage how your workspace is identified and configured.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Identity</CardTitle>
              <CardDescription>
                Manage how your workspace is identified and configured.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Workspace Name"
                  placeholder="e.g. Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <Textarea
                  label="Description"
                  placeholder="Tell us about this workspace..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px]"
                />

                <div className="space-y-3">
                  <Dropdown
                    label="Default Timezone"
                    options={timezoneOptions}
                    value={timezone}
                    onChange={setTimezone}
                    placeholder="Select a timezone"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={detectTimezone}
                    className="w-full justify-center"
                  >
                    <LocateFixed className="h-3.5 w-3.5 mr-2" />
                    Detect my timezone
                  </Button>
                </div>

                {formError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                    {formError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="hover:border-red-500/30 lg:col-start-1">
            <CardHeader>
              <CardTitle className="text-red-500">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions for this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDeactivated ? (
                <div className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-4 py-3">
                  <p className="text-sm text-slate-500">
                    This workspace is deactivated. All services have been
                    archived and tasks paused.
                  </p>
                </div>
              ) : (
                <>
                  {deactivateError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                      {deactivateError}
                    </div>
                  )}
                  <Button
                    variant="danger"
                    onClick={() => setIsDeactivateModalOpen(true)}
                    disabled={isDeactivating}
                  >
                    {isDeactivating
                      ? "Deactivating..."
                      : "Deactivate Workspace"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Modal
            isOpen={isDeactivateModalOpen}
            onClose={() => setIsDeactivateModalOpen(false)}
            danger
            title="Deactivate workspace?"
            description="This will archive all services and pause all tasks."
            footer={
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsDeactivateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeactivate}>
                  Deactivate
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-500">
                    This action will affect all resources
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
                    <li>
                      - All services will be archived and stopped if running
                    </li>
                    <li>- All active tasks will be paused</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-[var(--muted)]">
                You can reactivate the workspace at any time to restore access.
              </p>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}
