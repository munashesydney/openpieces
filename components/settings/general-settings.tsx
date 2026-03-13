"use client";

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

export function GeneralSettings() {
  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Identity</CardTitle>
            <CardDescription>Manage how your workspace is identified and accessed.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Input
                label="Workspace Name"
                placeholder="e.g. Acme Corporation"
                defaultValue="My Project"
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Workspace URL</label>
                <div className="flex rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden focus-within:ring-1 focus-within:ring-[var(--accent)] focus-within:border-[var(--accent)] transition-all">
                  <span className="flex items-center bg-[var(--hover-bg)] px-4 text-sm text-[var(--muted)] border-r border-[var(--border)]">
                    app.openpieces.com/
                  </span>
                  <input
                    type="text"
                    className="flex-1 px-4 py-2.5 text-sm text-[var(--foreground)] bg-transparent focus:outline-none"
                    placeholder="workspace-slug"
                    defaultValue="my-project"
                  />
                </div>
                <p className="text-xs text-[var(--muted)]">This is your persistent workspace identifier.</p>
              </div>

              <Textarea
                label="Description"
                placeholder="Tell us about this workspace..."
                defaultValue="This is my primary workspace for AI automation."
              />
            </div>
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

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="ghost">
            Cancel
          </Button>
          <Button>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
