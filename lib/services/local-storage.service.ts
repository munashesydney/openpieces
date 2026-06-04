/**
 * Thin typed wrapper around `window.localStorage` for client-side persistence.
 * All methods are safe to call in SSR contexts — they no-op gracefully.
 */

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Read and parse a JSON value. Returns `null` when missing or invalid. */
export function getItem<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Serialize and store a JSON-serializable value. */
export function setItem<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

/** Remove a single key. */
export function removeItem(key: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}
