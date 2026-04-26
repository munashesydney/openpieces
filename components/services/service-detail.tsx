"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  AlertCircle,
  ChevronLeft,
  Activity,
  Code,
  Clock,
  ShieldCheck,
  Zap,
  Plus,
  Trash2,
  Play,
  Loader2,
  Square,
  KeyRound,
  Link,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { Sheet } from "../ui/sheet";
import { Input } from "@/components/basic/input/input";
import { Textarea } from "@/components/basic/input/textarea";
import { Dropdown } from "@/components/basic/input/dropdown";
import { ActionMenu } from "@/components/basic/input/action-menu";
import { ServiceLogsPanel } from "./service-logs-panel";
import {
  type Service,
  type ServiceEndpoint,
  type ServiceRequiredSecret,
} from "@/lib/db/schema";
import {
  createEndpointAction,
  deleteEndpointAction,
  spawnServiceAction,
  stopServiceAction,
  addRequiredSecretAction,
  removeRequiredSecretAction,
  resetSpawnCountAction,
} from "@/app/workspace/[workspaceId]/personal/services/[serviceId]/actions";
import { deleteServiceAction } from "@/app/workspace/[workspaceId]/personal/services/actions";
import { ServiceDeleteModal } from "./service-delete-modal";
import { serviceDirectoryLabel } from "@/lib/utils/service-directory-label";

interface ServiceDetailProps {
  service: Service & { url?: string };
  endpoints: ServiceEndpoint[];
  requiredSecrets: ServiceRequiredSecret[];
  workspaceSecrets: { key: string; id: string; value: string }[];
  workspaceId: string;
}

type HealthStatus = {
  healthy: boolean;
  port: number | null;
  reason?: string;
} | null;

export function ServiceDetail({
  service,
  endpoints,
  requiredSecrets,
  workspaceSecrets,
  workspaceId,
}: ServiceDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSpawning, setIsSpawning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [spawnError, setSpawnError] = useState<string | null>(null);
  const [stopError, setStopError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSecretsSheetOpen, setIsSecretsSheetOpen] = useState(false);
  const [localRequiredSecrets, setLocalRequiredSecrets] =
    useState(requiredSecrets);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResettingSpawn, setIsResettingSpawn] = useState(false);

  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSecretKey, setSelectedSecretKey] = useState("");

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/services/${service.id}/health?workspaceId=${encodeURIComponent(workspaceId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      setHealth({ healthy: false, port: null, reason: "unreachable" });
    }
  }, [service.id, workspaceId]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleSpawn = () => {
    setIsSpawning(true);
    setSpawnError(null);
    startTransition(async () => {
      try {
        const result = await spawnServiceAction(workspaceId, service.id);
        if ("error" in result) {
          setSpawnError(result.error);
        }
      } catch (err: any) {
        setSpawnError(err?.message ?? "Failed to launch service");
      } finally {
        setIsSpawning(false);
      }
    });
  };

  const handleStop = () => {
    setIsStopping(true);
    setStopError(null);
    startTransition(async () => {
      try {
        const result = await stopServiceAction(workspaceId, service.id);
        if ("error" in result) {
          setStopError(result.error);
        }
      } catch (err: any) {
        setStopError(err?.message ?? "Failed to stop service");
      } finally {
        setIsStopping(false);
      }
    });
  };

  const handleResetSpawnCount = () => {
    startTransition(async () => {
      try {
        await resetSpawnCountAction(workspaceId, service.id);
      } catch (err: any) {
        console.error("Failed to reset spawn count", err);
      }
    });
  };

  const handleCreateEndpoint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!path) return;

    const formData = new FormData(e.currentTarget);
    formData.append("method", method);

    startTransition(async () => {
      try {
        await createEndpointAction(workspaceId, service.id, formData);
        setIsSheetOpen(false);
        setMethod("GET");
        setPath("");
        setDescription("");
      } catch (err) {
        console.error("Failed to create endpoint", err);
      }
    });
  };

  const handleDeleteEndpoint = (endpointId: string) => {
    startTransition(async () => {
      try {
        await deleteEndpointAction(workspaceId, service.id, endpointId);
      } catch (err) {
        console.error("Failed to delete endpoint", err);
      }
    });
  };

  const handleAddRequiredSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSecretKey) return;

    startTransition(async () => {
      try {
        await addRequiredSecretAction(
          workspaceId,
          service.id,
          selectedSecretKey,
        );
        const updated = await fetch(
          `/api/services/${service.id}/required-secrets?workspaceId=${encodeURIComponent(workspaceId)}`,
        )
          .then((r) => r.json())
          .then((d) => d.data);
        setLocalRequiredSecrets(updated);
        setIsSecretsSheetOpen(false);
        setSelectedSecretKey("");
      } catch (err) {
        console.error("Failed to add required secret", err);
      }
    });
  };

  const handleRemoveRequiredSecret = (id: string) => {
    startTransition(async () => {
      try {
        await removeRequiredSecretAction(workspaceId, service.id, id);
        setLocalRequiredSecrets((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        console.error("Failed to remove required secret", err);
      }
    });
  };

  const handleDeleteService = () => {
    startTransition(async () => {
      await deleteServiceAction(workspaceId, service.id);
      setIsDeleteModalOpen(false);
      router.push(`/workspace/${workspaceId}/personal/services`);
    });
  };

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10 font-Inter">
      <div className="w-full max-w-[820px] space-y-10">
        {/* Navigation & Header */}
        <div className="space-y-6">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Services
          </button>

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                {service.title}
              </h1>
              <p className="text-sm text-[var(--muted)]">
                {service.description || "Service Details & API Reference"}
              </p>
            </div>
            <div className="shrink-0">
              <ActionMenu
                onSelect={(val) => {
                  if (val === "delete") {
                    setIsDeleteModalOpen(true);
                  }
                }}
                options={[
                  {
                    label: "Delete Service",
                    value: "delete",
                    icon: <Trash2 className="h-4 w-4" />,
                    destructive: true,
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <ServiceDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteService}
          serviceTitle={service.title}
          isPending={isPending}
        />

        {service.spawnFailCount > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-5 py-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-500">
                  Spawn failed {service.spawnFailCount} time
                  {service.spawnFailCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-amber-500/70">
                  The service may need attention before it can start. Reset the
                  counter to allow retries.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetSpawnCount}
              disabled={isPending}
              className="shrink-0 text-amber-500 hover:text-amber-400"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        )}

        {/* Top Stats/Status */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Health / Launch card */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--muted)]">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Status
                  </p>
                  {health === null ? (
                    <span className="text-sm text-[var(--muted)]">
                      Checking…
                    </span>
                  ) : health.healthy ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        Healthy{health.port ? ` :${health.port}` : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {service.status === "deploying" ? (
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-[var(--muted)]" />
                      )}
                      <span className="text-sm font-semibold text-[var(--muted)]">
                        {service.status === "deploying"
                          ? "Deploying..."
                          : "Stopped"}
                      </span>
                    </div>
                  )}
                  {spawnError && (
                    <p className="mt-1 text-xs text-red-500">{spawnError}</p>
                  )}
                  {stopError && (
                    <p className="mt-1 text-xs text-red-500">{stopError}</p>
                  )}
                </div>
              </div>
              {service.status === "running" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStop}
                  disabled={isStopping || isPending}
                  title="Stop service"
                >
                  {isStopping || isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSpawn}
                  disabled={
                    isSpawning ||
                    isPending ||
                    !service.directory ||
                    service.status === "deploying"
                  }
                  title={
                    !service.directory
                      ? "No directory set"
                      : "Launch service process"
                  }
                >
                  {isSpawning || isPending || service.status === "deploying" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--muted)]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  Directory
                </p>
                <span
                  className="text-sm font-semibold text-[var(--foreground)] truncate max-w-[200px] block"
                  title={service.directory ?? ""}
                >
                  {service.directory ? (
                    serviceDirectoryLabel(service.directory)
                  ) : (
                    <span className="text-[var(--muted)]">Not set</span>
                  )}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--muted)]">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  Port
                </p>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {service.port ?? (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </span>
              </div>
            </div>
          </Card>

          {service.url && (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--muted)]">
                  <Link className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Service URL
                  </p>
                  <a
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[var(--foreground)] hover:text-blue-500 truncate block"
                  >
                    {service.url}
                  </a>
                </div>
              </div>
            </Card>
          )}

          {service.spawnFailCount > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-red-500">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Spawn Failures
                    </p>
                    <span className="text-sm font-semibold text-red-500">
                      {service.spawnFailCount}{" "}
                      {service.spawnFailCount === 1 ? "failure" : "failures"}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetSpawnCount}
                  disabled={isPending}
                  title="Reset spawn failure count"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Reset</span>
                </Button>
              </div>
            </Card>
          )}
        </div>

        <ServiceLogsPanel workspaceId={workspaceId} serviceId={service.id} />

        {/* Endpoints Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-[var(--muted)]" />
                <CardTitle>API Endpoints</CardTitle>
              </div>
              <CardDescription>
                Available routes and methods for this service.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--border)]">
              {endpoints.map((endpoint, i) => (
                <div
                  key={endpoint.id}
                  className={`group flex items-start justify-between gap-4 py-6 first:pt-0 last:pb-0 ${isPending ? "opacity-50" : ""}`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wider ${
                          endpoint.method === "GET"
                            ? "border-emerald-500/20 text-emerald-500"
                            : endpoint.method === "POST"
                              ? "border-blue-500/20 text-blue-500"
                              : endpoint.method === "DELETE"
                                ? "border-red-500/20 text-red-500"
                                : "border-amber-500/20 text-amber-500"
                        }`}
                      >
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-[var(--foreground)] opacity-80">
                        {endpoint.path}
                      </code>
                    </div>
                    {endpoint.description && (
                      <p className="text-sm text-[var(--muted)]">
                        {endpoint.description}
                      </p>
                    )}
                    {endpoint.inputSchema &&
                      Object.keys(endpoint.inputSchema).length > 0 && (
                        <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--hover-bg)] p-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-2">
                            Input Schema
                          </p>
                          <pre className="text-xs font-mono text-[var(--foreground)] overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(endpoint.inputSchema, null, 2)}
                          </pre>
                        </div>
                      )}
                  </div>
                  <div className="shrink-0">
                    <ActionMenu
                      onSelect={(val) => {
                        if (val === "delete") {
                          handleDeleteEndpoint(endpoint.id);
                        }
                      }}
                      options={[
                        {
                          label: "Delete",
                          value: "delete",
                          icon: <Trash2 className="h-4 w-4" />,
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </div>
              ))}
              {endpoints.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
                  No endpoints defined yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* New Endpoint Sheet */}
        <Sheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Create New Endpoint"
          description="Define a new API route mapping for this service."
          footer={<></>} // Handled inside form
        >
          <form className="space-y-6" onSubmit={handleCreateEndpoint}>
            <div className="space-y-6">
              <Dropdown
                label="HTTP Method"
                value={method}
                onChange={setMethod}
                options={[
                  { label: "GET", value: "GET" },
                  { label: "POST", value: "POST" },
                  { label: "PUT", value: "PUT" },
                  { label: "PATCH", value: "PATCH" },
                  { label: "DELETE", value: "DELETE" },
                ]}
              />
              <Input
                name="path"
                label="Endpoint Path"
                placeholder="e.g. /v1/users/:id"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                required
              />
              <Textarea
                name="description"
                label="Description"
                placeholder="Describe what this endpoint does."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSheetOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !path}>
                {isPending ? "Creating..." : "Create Endpoint"}
              </Button>
            </div>
          </form>
        </Sheet>

        {/* Required Secrets Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[var(--muted)]" />
                <CardTitle>Required Secrets</CardTitle>
              </div>
              <CardDescription>
                Secrets that must be set before starting this service.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsSecretsSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Required Secret
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--border)]">
              {localRequiredSecrets.map((req) => {
                const secret = workspaceSecrets.find(
                  (s) => s.key === req.secretKey,
                );
                const hasSecret = secret && secret.value?.trim();
                return (
                  <div
                    key={req.id}
                    className={`group flex items-start justify-between gap-4 py-6 first:pt-0 last:pb-0 ${isPending ? "opacity-50" : ""}`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <code className="text-sm font-mono text-[var(--foreground)] opacity-80">
                          {req.secretKey}
                        </code>
                        {hasSecret ? (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-500">
                            Set
                          </span>
                        ) : (
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-500">
                            Missing
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <ActionMenu
                        onSelect={(val) => {
                          if (val === "delete") {
                            handleRemoveRequiredSecret(req.id);
                          }
                        }}
                        options={[
                          {
                            label: "Remove",
                            value: "delete",
                            icon: <Trash2 className="h-4 w-4" />,
                            destructive: true,
                          },
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
              {localRequiredSecrets.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
                  No required secrets defined yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Required Secret Sheet */}
        <Sheet
          isOpen={isSecretsSheetOpen}
          onClose={() => setIsSecretsSheetOpen(false)}
          title="Add Required Secret"
          description="Select a secret that this service requires to run."
          footer={<></>}
        >
          <form className="space-y-6" onSubmit={handleAddRequiredSecret}>
            <div className="space-y-6">
              <Dropdown
                label="Secret Key"
                value={selectedSecretKey}
                onChange={setSelectedSecretKey}
                options={workspaceSecrets.map((s) => ({
                  label: s.key,
                  value: s.key,
                }))}
                placeholder="Select a secret..."
              />
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSecretsSheetOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !selectedSecretKey}>
                {isPending ? "Adding..." : "Add Secret"}
              </Button>
            </div>
          </form>
        </Sheet>

        {/* Security / Compliance Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--muted)]" />
              <CardTitle>Security & Compliance</CardTitle>
            </div>
            <CardDescription>
              All endpoints are secured via JWT and Rate Limited.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                TLS 1.3 Active
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                SOC2 Compliant
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                AES-256 Encryption
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
