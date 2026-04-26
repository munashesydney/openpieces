"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

type SystemHealthState = {
  isHealthy: boolean | null;
  isChecking: boolean;
  lastError: string | null;
};

const SystemHealthContext = createContext<SystemHealthState>({
  isHealthy: null,
  isChecking: true,
  lastError: null,
});

export function useSystemHealth() {
  return useContext(SystemHealthContext);
}

const HEALTHY_INTERVAL_MS = 30_000;
const UNHEALTHY_INTERVAL_MS = 5_000;

export function SystemHealthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SystemHealthState>({
    isHealthy: null,
    isChecking: true,
    lastError: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    setState((prev) => ({ ...prev, isChecking: true }));
    try {
      const res = await fetch("/api/opencode/health", { cache: "no-store" });
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        isHealthy: data.healthy === true,
        isChecking: false,
        lastError: data.healthy ? null : (data.error ?? "Unknown error"),
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to check health";
      setState((prev) => ({
        ...prev,
        isHealthy: false,
        isChecking: false,
        lastError: message,
      }));
    }
  }, []);

  // Initial check + setup polling
  useEffect(() => {
    check();

    intervalRef.current = setInterval(check, HEALTHY_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check]);

  // Adjust polling frequency based on health status
  useEffect(() => {
    if (!intervalRef.current) return;
    clearInterval(intervalRef.current);
    const ms =
      state.isHealthy === false ? UNHEALTHY_INTERVAL_MS : HEALTHY_INTERVAL_MS;
    intervalRef.current = setInterval(check, ms);
  }, [state.isHealthy, check]);

  return (
    <SystemHealthContext.Provider value={state}>
      {children}
    </SystemHealthContext.Provider>
  );
}
