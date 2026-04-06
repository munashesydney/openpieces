"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";
import { Textarea } from "@/components/basic/input/textarea";
import { updateGeneralSettingsAction } from "@/app/workspace/[workspaceId]/settings/general/actions";

type GeneralSettingsProps = {
  workspaceId: string;
  initialName: string;
  initialDescription: string;
};

export function GeneralSettings({
  workspaceId,
  initialName,
  initialDescription,
}: GeneralSettingsProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Identity</CardTitle>
            <CardDescription>Manage how your workspace is identified.</CardDescription>
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

        <Card className="hover:border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-500">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions for this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger">
              Delete Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}