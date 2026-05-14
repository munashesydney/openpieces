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
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="flex w-full px-6 pb-20">
      <div className="w-full px-4">
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
            <CardContent>
              <Button variant="danger">Delete Workspace</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
