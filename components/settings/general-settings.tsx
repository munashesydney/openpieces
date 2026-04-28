"use client";

import { useState, useTransition } from "react";
import { LocateFixed } from "lucide-react";
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
import type { DropdownOption } from "@/components/basic/input/dropdown";
import {
  updateGeneralSettingsAction,
  updateTimezoneAction,
} from "@/app/workspace/[workspaceId]/settings/general/actions";
import { COMMON_TIMEZONES } from "@/lib/utils/timezones";

type GeneralSettingsProps = {
  workspaceId: string;
  initialName: string;
  initialDescription: string;
  initialTimezone: string;
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
}: GeneralSettingsProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [formError, setFormError] = useState<string | null>(null);
  const [tzFormError, setTzFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tzPending, startTzTransition] = useTransition();

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

    startTransition(async () => {
      const result = await updateGeneralSettingsAction(workspaceId, formData);
      if ("error" in result) {
        setFormError(result.error);
      }
    });
  };

  const handleTimezoneSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTzFormError(null);

    const formData = new FormData();
    formData.set("timezone", timezone);

    startTzTransition(async () => {
      const result = await updateTimezoneAction(workspaceId, formData);
      if ("error" in result) {
        setTzFormError(result.error);
      }
    });
  };

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Identity</CardTitle>
            <CardDescription>
              Manage how your workspace is identified.
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
              />

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

        <Card>
          <CardHeader>
            <CardTitle>Default Timezone</CardTitle>
            <CardDescription>
              Default timezone used for recurring task scheduling when a task
              doesn't specify one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTimezoneSubmit} className="space-y-6">
              <div className="space-y-3">
                <Dropdown
                  label="Timezone"
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
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  Detect my timezone
                </Button>
              </div>

              <p className="text-xs text-[var(--muted)]">
                Your current timezone detected by the browser:{" "}
                {typeof window !== "undefined"
                  ? Intl.DateTimeFormat().resolvedOptions().timeZone
                  : "..."}
              </p>

              {tzFormError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  {tzFormError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button type="submit" disabled={tzPending}>
                  {tzPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="hover:border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-500">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions for this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger">Delete Workspace</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
