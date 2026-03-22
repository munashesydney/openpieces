"use client";

import * as React from "react";
import { Search, Workflow, Puzzle, Calendar, Code, Route, ChevronRight } from "lucide-react";

type SearchMode = "workflows" | "services" | "tasks" | "endpoints" | "opencode";

interface SearchResult {
  id: string;
  name: string;
  description: string;
  type: SearchMode;
}

const mockResults: SearchResult[] = [
  // Workflows
  { id: "w1", name: "Email Parser", description: "Parse emails and extract data", type: "workflows" },
  { id: "w2", name: "GitHub Issue Creator", description: "Create issues from sources", type: "workflows" },
  { id: "w3", name: "Slack Notifier", description: "Send Slack notifications", type: "workflows" },
  // Services
  { id: "s1", name: "GitHub API", description: "Connect to GitHub", type: "services" },
  { id: "s2", name: "Slack API", description: "Connect to Slack", type: "services" },
  { id: "s3", name: "Email Service", description: "SMTP email service", type: "services" },
  // Tasks
  { id: "t1", name: "Review PR #142", description: "Review and merge PR", type: "tasks" },
  { id: "t2", name: "Update Documentation", description: "Update API docs", type: "tasks" },
  // Endpoints
  { id: "e1", name: "POST /api/webhooks", description: "Receive webhooks", type: "endpoints" },
  { id: "e2", name: "GET /api/users", description: "List users", type: "endpoints" },
  // OpenCode
  { id: "o1", name: "Debug auth flow", description: "Fix login issue", type: "opencode" },
  { id: "o2", name: "Add user validation", description: "Validate user input", type: "opencode" },
];

const modeConfig: Record<SearchMode, { label: string; icon: typeof Workflow }> = {
  workflows: { label: "Workflows", icon: Workflow },
  services: { label: "Services", icon: Puzzle },
  tasks: { label: "Tasks", icon: Calendar },
  endpoints: { label: "Endpoints", icon: Route },
  opencode: { label: "OpenCode", icon: Code },
};

const mockActivityData = [
  { id: "1", time: "2 min ago", event: "Workflow executed", status: "success" },
  { id: "2", time: "15 min ago", event: "Workflow triggered", status: "success" },
  { id: "3", time: "1 hour ago", event: "Execution failed", status: "error" },
  { id: "4", time: "2 hours ago", event: "Workflow completed", status: "success" },
  { id: "5", time: "3 hours ago", event: "Scheduled run", status: "success" },
];

export function ActivityView() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [selectedMode, setSelectedMode] = React.useState<SearchMode>("workflows");
  const [selectedResult, setSelectedResult] = React.useState<SearchResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredResults = mockResults
    .filter((r) => r.type === selectedMode)
    .filter(
      (r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsDropdownOpen(value.length > 0);
  };

  const handleSelectResult = (result: SearchResult) => {
    setSelectedResult(result);
    setSearchQuery(result.name);
    setIsDropdownOpen(false);
  };

  const handleModeChange = (mode: SearchMode) => {
    setSelectedMode(mode);
    setSelectedResult(null);
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleClearSelection = () => {
    setSelectedResult(null);
    setSearchQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Mode selector */}
      <div className="flex items-center justify-center gap-1 px-8 pt-8">
        {(Object.keys(modeConfig) as SearchMode[]).map((mode) => {
          const Icon = modeConfig[mode].icon;
          const isActive = selectedMode === mode;
          return (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {modeConfig[mode].label}
            </button>
          );
        })}
      </div>

      {/* Search area */}
      <div className="flex flex-col items-center px-8 pt-6">
        <div ref={containerRef} className="relative w-full max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchQuery.length > 0) setIsDropdownOpen(true);
              }}
              placeholder={`Search ${modeConfig[selectedMode].label.toLowerCase()}...`}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] py-3 pl-12 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          {/* Dropdown */}
          {isDropdownOpen && !selectedResult && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="max-h-60 overflow-y-auto p-1.5">
                {filteredResults.length > 0 ? (
                  filteredResults.map((result) => {
                    const Icon = modeConfig[result.type].icon;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelectResult(result)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--hover-bg)]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--hover-bg)]">
                          <Icon className="h-4 w-4 text-[var(--accent)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">
                            {result.name}
                          </p>
                          <p className="truncate text-xs text-[var(--muted)]">
                            {result.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                    No {modeConfig[selectedMode].label.toLowerCase()} found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected result indicator */}
        {selectedResult && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--hover-bg)] px-3 py-1.5">
              {React.createElement(modeConfig[selectedResult.type].icon, {
                className: "h-4 w-4 text-[var(--accent)]",
              })}
              <span className="text-sm font-medium text-[var(--foreground)]">
                {selectedResult.name}
              </span>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-auto px-8 pb-8 pt-6">
        <div className="mx-auto max-w-2xl">
          {selectedResult ? (
            <div className="space-y-2">
              {mockActivityData.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        activity.status === "success"
                          ? "bg-green-500"
                          : activity.status === "error"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-sm text-[var(--foreground)]">{activity.event}</span>
                  </div>
                  <span className="text-xs text-[var(--muted)]">{activity.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--hover-bg)]">
                <Search className="h-6 w-6 text-[var(--muted)]" />
              </div>
              <h3 className="mt-4 text-base font-medium text-[var(--foreground)]">
                Select a {modeConfig[selectedMode].label.toLowerCase().slice(0, -1)}
              </h3>
              <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                Search and select a {modeConfig[selectedMode].label.toLowerCase().slice(0, -1)} above to view its activity
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
