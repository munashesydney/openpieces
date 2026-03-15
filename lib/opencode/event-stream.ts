/**
 * In-memory SSE store for OpenCode session events.
 * Broadcasts events from webhook to connected clients.
 */

const sessionWriters = new Map<string, Set<WritableStreamDefaultWriter>>();

function getWriters(sessionId: string): Set<WritableStreamDefaultWriter> {
  let set = sessionWriters.get(sessionId);
  if (!set) {
    set = new Set();
    sessionWriters.set(sessionId, set);
  }
  return set;
}

function removeWriter(sessionId: string, writer: WritableStreamDefaultWriter) {
  const set = sessionWriters.get(sessionId);
  if (set) {
    set.delete(writer);
    if (set.size === 0) sessionWriters.delete(sessionId);
  }
}

const encoder = new TextEncoder();

export function broadcastSessionEvent(sessionId: string, event: unknown): void {
  const writers = sessionWriters.get(sessionId);
  if (!writers || writers.size === 0) return;

  const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

  for (const writer of writers) {
    writer.write(data).catch(() => {
      removeWriter(sessionId, writer);
    });
  }
}

/**
 * Subscribe to events for a session. Returns a ReadableStream for SSE response.
 */
export function subscribe(sessionId: string): ReadableStream<Uint8Array> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  getWriters(sessionId).add(writer);
  return readable;
}
