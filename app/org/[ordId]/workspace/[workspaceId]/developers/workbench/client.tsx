"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  Play,
  Check,
  Copy,
  AlertCircle,
  ExternalLink,
  Clock,
  ArrowRightLeft,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  getWebhookDeliveriesAction,
  retryWebhookDeliveryAction,
} from "./actions";

interface WebhookDelivery {
  id: string;
  webhookId: string;
  workspaceId: string;
  eventName: string;
  payload: any;
  responseStatus: number | null;
  responseBody: string | null;
  success: boolean;
  startedAt: string;
  completedAt: string;
  webhookUrl: string;
  attempt: number;
  status: string;
  retryAt: string | null;
}

function RetryCountdown({
  retryAt,
  onElapsed,
}: {
  retryAt: string;
  onElapsed?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(retryAt).getTime();
      const now = Date.now();
      const diffMs = target - now;

      if (diffMs <= 0) {
        onElapsed?.();
        return "Retrying now...";
      }

      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return `in ${diffSecs}s`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `in ${diffMins}m ${diffSecs % 60}s`;
      const diffHrs = Math.floor(diffMins / 60);
      return `in ${diffHrs}h ${diffMins % 60}m`;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAt, onElapsed]);

  return <span className="font-medium">{timeLeft}</span>;
}

export function WorkbenchClient({
  initialDeliveries,
  workspaceId,
}: {
  initialDeliveries: WebhookDelivery[];
  workspaceId: string;
}) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>(initialDeliveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedUrl, setSelectedUrl] = useState("all");

  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [activeTab, setActiveTab] = useState<"request" | "response" | "headers">("request");
  const [copiedText, setCopiedText] = useState<"payload" | "response" | "headers" | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Helper to trigger temporary toast message
  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Manual Refresh of logs
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await getWebhookDeliveriesAction(workspaceId);
      if (result.error) {
        triggerToast(result.error, "error");
      } else if (result.deliveries) {
        setDeliveries(result.deliveries as any);

        // Keep the selected delivery in sync if open
        if (selectedDelivery) {
          const updated = result.deliveries.find((d: any) => d.id === selectedDelivery.id);
          if (updated) setSelectedDelivery(updated as any);
        }
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to refresh logs", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh when countdowns elapse or on load to keep state accurate
  useEffect(() => {
    const timer = setInterval(() => {
      // Refresh silently if there are any retrying logs to keep remaining times accurate
      if (deliveries.some((d) => d.status === "retrying")) {
        handleRefresh();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [deliveries]);

  // Manual Retry / Resend Webhook Event
  const handleResend = (deliveryId: string) => {
    startTransition(async () => {
      try {
        const result = await retryWebhookDeliveryAction(workspaceId, deliveryId);
        if (result.error) {
          triggerToast(result.error, "error");
        } else {
          triggerToast("Webhook delivery enqueued successfully!");
          // Tiny delay then refresh so user can see the new delivery attempt
          setTimeout(() => {
            handleRefresh();
          }, 800);
        }
      } catch (err: any) {
        triggerToast(err.message || "Failed to retry delivery", "error");
      }
    });
  };

  // Copy helper
  const handleCopy = async (text: string, tab: "payload" | "response" | "headers") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(tab);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      triggerToast("Failed to copy", "error");
    }
  };

  // Format response latency
  const getLatency = (d: WebhookDelivery) => {
    const start = new Date(d.startedAt).getTime();
    const end = new Date(d.completedAt).getTime();
    const diff = end - start;
    return isNaN(diff) || diff < 0 ? 0 : diff;
  };

  // Dynamic filter lists
  const eventNamesList = useMemo(() => {
    const list = new Set<string>();
    deliveries.forEach((d) => list.add(d.eventName));
    return Array.from(list);
  }, [deliveries]);

  const urlsList = useMemo(() => {
    const list = new Set<string>();
    deliveries.forEach((d) => list.add(d.webhookUrl));
    return Array.from(list);
  }, [deliveries]);

  // Compute Metrics from all fetched deliveries
  const metrics = useMemo(() => {
    if (deliveries.length === 0) {
      return { successRate: 100, total: 0, avgLatency: 0 };
    }
    const total = deliveries.length;
    const successes = deliveries.filter((d) => d.success).length;
    const successRate = Math.round((successes / total) * 1000) / 10;
    const totalLatency = deliveries.reduce((acc, d) => acc + getLatency(d), 0);
    const avgLatency = Math.round(totalLatency / total);

    return { successRate, total, avgLatency };
  }, [deliveries]);

  // Filtered Deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchesSearch =
        d.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.webhookUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(d.payload).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesEvent = selectedEvent === "all" || d.eventName === selectedEvent;
      
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "success" && d.success) ||
        (selectedStatus === "failed" && !d.success && d.status !== "retrying") ||
        (selectedStatus === "retrying" && d.status === "retrying");

      const matchesUrl = selectedUrl === "all" || d.webhookUrl === selectedUrl;

      return matchesSearch && matchesEvent && matchesStatus && matchesUrl;
    });
  }, [deliveries, searchQuery, selectedEvent, selectedStatus, selectedUrl]);

  // Format long timestamps
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getStatusText = (status: number | null) => {
    if (status === null) return "Network Error";
    if (status >= 200 && status < 300) return `${status} OK`;
    return `${status} Error`;
  };

  const getStatusBadge = (delivery: WebhookDelivery) => {
    if (delivery.status === "retrying" && delivery.retryAt) {
      return (
        <span className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          Retrying <RetryCountdown retryAt={delivery.retryAt} onElapsed={handleRefresh} />
        </span>
      );
    }
    if (delivery.success) {
      return (
        <span className="inline-flex shrink-0 items-center justify-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {getStatusText(delivery.responseStatus)}
        </span>
      );
    }
    return (
      <span className="inline-flex shrink-0 items-center justify-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
        {delivery.status === "failed" ? "Failed" : getStatusText(delivery.responseStatus)}
      </span>
    );
  };

  // Format single delivery request headers
  const getMockRequestHeaders = (d: WebhookDelivery) => {
    return `POST / HTTP/1.1
Host: ${new URL(d.webhookUrl).host}
Content-Type: application/json
X-OP-Event: ${d.eventName}
X-OP-Signature: whsec_abc123...[HMAC-SHA256]
User-Agent: OpenPieces-Webhook/1.0
Connection: keep-alive`;
  };

  const getFormattedJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return "";
    }
  };

  const getFormattedResponse = (d: WebhookDelivery) => {
    const body = d.responseBody || "";
    try {
      // Try to parse and format response body as JSON
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  };

  return (
    <div className="flex w-full px-6 pb-20 pt-8 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded border px-4 py-3 shadow-lg transition-all duration-300 ${
          toastMessage.type === "success"
            ? "border-emerald-500/30 bg-black/90 text-emerald-400"
            : "border-red-500/30 bg-black/90 text-red-400"
        }`}>
          <AlertCircle size={16} />
          <span className="text-[13px] font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Left aligned page content (matches api keys and webhook pages) */}
      <div className="w-full max-w-[820px] px-4 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">
              Developer
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              Webhook Workbench
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              Inspect, test, and debug webhook deliveries in real-time.
            </p>
          </div>
          <Button
            variant="outline"
            size="md"
            className="mt-8 flex items-center gap-1.5"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            Refresh Logs
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Success Rate */}
          <Card className="border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden relative">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--muted)]">Success Rate</span>
                <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
                  <Activity size={14} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  {metrics.total === 0 ? "100%" : `${metrics.successRate}%`}
                </span>
              </div>
              <div className="mt-3.5 h-1.5 w-full rounded bg-[var(--hover-bg)] overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${metrics.total === 0 ? 100 : metrics.successRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total Attempts */}
          <Card className="border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--muted)]">Total Attempts</span>
                <span className="p-1.5 rounded bg-[var(--hover-bg-strong)] text-[var(--muted)]">
                  <ArrowRightLeft size={14} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  {metrics.total}
                </span>
                <span className="text-[11px] text-[var(--muted)]">attempts logged</span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                <Terminal size={12} className="text-[var(--accent)]" />
                <span>Stores last 50 deliveries</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Avg Latency */}
          <Card className="border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--muted)]">Avg Latency</span>
                <span className="p-1.5 rounded bg-amber-500/10 text-amber-400">
                  <Clock size={14} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  {metrics.avgLatency}ms
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Calculated client-side</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 bg-[var(--sidebar-bg)] border border-[var(--border)] p-4 rounded">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
            <Input
              placeholder="Search deliveries payload, events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full bg-[var(--hover-bg)] border-[var(--border)] text-[13px] placeholder:text-[var(--muted)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Event Name filter */}
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="h-9 px-3 rounded border border-[var(--border)] bg-[var(--hover-bg)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
            >
              <option value="all">All Events</option>
              {eventNamesList.map((evt) => (
                <option key={evt} value={evt}>
                  {evt}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 rounded border border-[var(--border)] bg-[var(--hover-bg)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success (2xx)</option>
              <option value="failed">Failed (Non-2xx)</option>
              <option value="retrying">Retrying</option>
            </select>

            {/* Endpoint filter */}
            <select
              value={selectedUrl}
              onChange={(e) => setSelectedUrl(e.target.value)}
              className="h-9 max-w-[200px] px-3 rounded border border-[var(--border)] bg-[var(--hover-bg)] text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer truncate"
            >
              <option value="all">All Destinations</option>
              {urlsList.map((url) => (
                <option key={url} value={url}>
                  {url}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Deliveries Log List */}
        <div className="space-y-2.5">
          {filteredDeliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded border border-dashed border-[var(--border)] text-center bg-[var(--sidebar-bg)]/30">
              <Activity className="h-8 w-8 text-[var(--muted)]/40 mb-3" />
              <p className="text-[13px] text-[var(--muted)]">No delivery attempts found matching these filters.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedEvent("all");
                  setSelectedStatus("all");
                  setSelectedUrl("all");
                }}
                className="mt-2 text-[12px] font-medium text-[var(--accent)] hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="border border-[var(--border)] rounded overflow-hidden divide-y divide-[var(--border)] bg-[var(--sidebar-bg)]">
              {filteredDeliveries.map((delivery) => {
                const latency = getLatency(delivery);
                return (
                  <div
                    key={delivery.id}
                    onClick={() => {
                      setSelectedDelivery(delivery);
                      setActiveTab("request");
                    }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status badge */}
                      {getStatusBadge(delivery)}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[var(--foreground)]">
                            {delivery.eventName}
                          </span>
                          <span className="text-[11px] text-[var(--muted)]/60 truncate max-w-[200px]">
                            {delivery.webhookUrl}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[12px] text-[var(--muted)] self-end md:self-auto">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="opacity-60" />
                        {latency}ms
                      </span>
                      <span>{formatDateTime(delivery.startedAt)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[var(--muted)] hover:text-[var(--foreground)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResend(delivery.id);
                        }}
                        disabled={isPending}
                        title="Resend webhook event"
                      >
                        {isPending && selectedDelivery?.id === delivery.id ? (
                          <RefreshCw size={12} className="animate-spin text-[var(--accent)]" />
                        ) : (
                          <Play size={12} />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Details Modal */}
        <Modal
          isOpen={selectedDelivery !== null}
          onClose={() => setSelectedDelivery(null)}
          title="Delivery Details"
          description={`Inspect request & response details for event ${selectedDelivery?.eventName}`}
          maxWidthClassName="max-w-3xl"
          footer={
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--muted)] break-all truncate pr-4">
                ID: {selectedDelivery?.id}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDelivery(null)}
                >
                  Close
                </Button>
                {selectedDelivery && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-1.5"
                    onClick={() => handleResend(selectedDelivery.id)}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Play size={12} fill="currentColor" />
                    )}
                    Resend Event
                  </Button>
                )}
              </div>
            </div>
          }
        >
          {selectedDelivery && (
            <div className="space-y-5">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-[var(--hover-bg)] p-3.5 rounded border border-[var(--border)]">
                <div>
                  <div className="text-[11px] text-[var(--muted)]">Status</div>
                  <div className="mt-0.5">
                    {getStatusBadge(selectedDelivery)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--muted)]">Attempt</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-[var(--foreground)]">
                    {selectedDelivery.attempt} / 6
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--muted)]">Duration</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-[var(--foreground)]">
                    {getLatency(selectedDelivery)}ms
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--muted)]">Started At</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-[var(--foreground)] truncate" title={new Date(selectedDelivery.startedAt).toISOString()}>
                    {formatDateTime(selectedDelivery.startedAt)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--muted)]">Endpoint</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-[var(--foreground)] truncate" title={selectedDelivery.webhookUrl}>
                    <a
                      href={selectedDelivery.webhookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      URL
                      <ExternalLink size={10} className="inline-block" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Tabs selector */}
              <div className="border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex gap-2 -mb-[1px]">
                  <button
                    onClick={() => setActiveTab("request")}
                    className={`pb-2 text-[13px] font-medium border-b-2 px-1 transition-all ${
                      activeTab === "request"
                        ? "border-[var(--accent)] text-[var(--foreground)]"
                        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Request Payload
                  </button>
                  <button
                    onClick={() => setActiveTab("response")}
                    className={`pb-2 text-[13px] font-medium border-b-2 px-1 transition-all ${
                      activeTab === "response"
                        ? "border-[var(--accent)] text-[var(--foreground)]"
                        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Response Body
                  </button>
                  <button
                    onClick={() => setActiveTab("headers")}
                    className={`pb-2 text-[13px] font-medium border-b-2 px-1 transition-all ${
                      activeTab === "headers"
                        ? "border-[var(--accent)] text-[var(--foreground)]"
                        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Request Headers
                  </button>
                </div>

                {/* Tab actions */}
                {activeTab === "request" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[var(--muted)] hover:text-[var(--foreground)]"
                    onClick={() => handleCopy(getFormattedJSON(selectedDelivery.payload), "payload")}
                  >
                    {copiedText === "payload" ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                    Copy JSON
                  </Button>
                )}
                {activeTab === "response" && selectedDelivery.responseBody && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[var(--muted)] hover:text-[var(--foreground)]"
                    onClick={() => handleCopy(getFormattedResponse(selectedDelivery), "response")}
                  >
                    {copiedText === "response" ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                    Copy Raw
                  </Button>
                )}
                {activeTab === "headers" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[var(--muted)] hover:text-[var(--foreground)]"
                    onClick={() => handleCopy(getMockRequestHeaders(selectedDelivery), "headers")}
                  >
                    {copiedText === "headers" ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                    Copy Headers
                  </Button>
                )}
              </div>

              {/* Tab Content */}
              <div className="bg-black/35 rounded border border-[var(--border)] p-4 max-h-[400px] overflow-y-auto font-mono text-[12px] text-[var(--foreground)] leading-relaxed selection:bg-[var(--accent)]/30">
                {activeTab === "request" && (
                  <pre className="whitespace-pre-wrap break-all">
                    {getFormattedJSON({
                      event: selectedDelivery.eventName,
                      timestamp: selectedDelivery.startedAt,
                      data: selectedDelivery.payload,
                    })}
                  </pre>
                )}

                {activeTab === "response" && (
                  <div>
                    {selectedDelivery.responseBody ? (
                      <pre className="whitespace-pre-wrap break-all">
                        {getFormattedResponse(selectedDelivery)}
                      </pre>
                    ) : (
                      <div className="text-[var(--muted)] italic py-2 flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        No response body was returned from the server.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "headers" && (
                  <pre className="whitespace-pre-wrap">
                    {getMockRequestHeaders(selectedDelivery)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
