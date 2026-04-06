"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to `window.matchMedia(query)`. Server snapshot is `false` (mobile-first).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
