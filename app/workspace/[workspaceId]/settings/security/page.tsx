"use client";

import { useState } from "react";
import { Shield, Key } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";

export default function SecurityPage() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const response = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (response.ok) {
      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
    } else {
      setError(data.error || "Failed to change password");
    }
  };

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[var(--muted)]" />
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Authentication</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage how you secure your account access.</p>

          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-[var(--muted)]" />
                <div>
                  <h3 className="text-sm font-medium">Change Password</h3>
                  <p className="text-xs text-[var(--muted)]">Update your account password.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
              >
                {isChangingPassword ? "Cancel" : "Change"}
              </Button>
            </div>

            {isChangingPassword && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--foreground)]">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--foreground)]">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--foreground)]">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}

                {success && (
                  <p className="text-xs text-green-500">{success}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleChangePassword}>
                    Update Password
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}