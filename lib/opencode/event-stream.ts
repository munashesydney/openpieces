/**
 * In-memory SSE store for OpenCode session events.
 * Broadcasts events from webhook to connected clients.
 */

/**
 * Global ref so all Next.js dev workers share the same in-memory store.
 * Falls back to a local Map if globalThis is unavailable (should never happen).
 */
const globalStore =
  (globalThis as any).__opencode_sse_writers ??
  ((globalThis as any).__opencode_sse_writers = new Map<
    string,
    Set<WritableStreamDefaultWriter>
  >());

function getWriters(sessionId: string): Set<WritableStreamDefaultWriter> {
  let set = globalStore.get(sessionId);
  if (!set) {
    set = new Set();
    globalStore.set(sessionId, set);
  }
  return set;
}

function removeWriter(sessionId: string, writer: WritableStreamDefaultWriter) {
  const set = globalStore.get(sessionId);
  if (set) {
    set.delete(writer);
    if (set.size === 0) globalStore.delete(sessionId);
  }
}

const encoder = new TextEncoder();

export function broadcastSessionEvent(sessionId: string, event: unknown): void {
  const writers = globalStore.get(sessionId);
  if (!writers || writers.size === 0) {
    // In serverless environments, SSE writers may not be available due to
    // request being handled by different processes. This is expected in dev
    // with multiple workers. The client will fall back to polling.
    return;
  }

  const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

  for (const writer of writers) {
    writer.write(data).catch(() => {
      removeWriter(sessionId, writer);
    });
  }
}

/**
 * Subscribe to events for a session. Returns a ReadableStream for SSE response.
 * Writers are cleaned up via the abort signal passed to the route handler.
 */
export function subscribe(
  sessionId: string,
  abortSignal?: AbortSignal,
): ReadableStream<Uint8Array> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  getWriters(sessionId).add(writer);

  // Clean up writer when client disconnects via abort signal
  if (abortSignal) {
    abortSignal.addEventListener("abort", () => {
      removeWriter(sessionId, writer);
    });
  }

  return readable;
}
