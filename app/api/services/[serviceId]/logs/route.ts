import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readServiceLogChunk, readServiceLogTail } from "@/lib/services/service-log-stream";
import { getServiceById } from "@/lib/services/service.service";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function formatEvent(event: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
  }

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const abortListener = () => {
        close();
      };

      const close = () => {
        if (closed) return;
        closed = true;
        request.signal.removeEventListener("abort", abortListener);
        controller.close();
      };

      request.signal.addEventListener("abort", abortListener);

      void (async () => {
        try {
          const initial = await readServiceLogTail(workspaceId, serviceId);
          let offset = initial.nextOffset;

          if (initial.content) {
            controller.enqueue(formatEvent({ type: "snapshot", content: initial.content }));
          }

          let heartbeatCounter = 0;

          while (!closed && !request.signal.aborted) {
            const next = await readServiceLogChunk(workspaceId, serviceId, offset);
            offset = next.nextOffset;

            if (next.content) {
              controller.enqueue(formatEvent({ type: "chunk", content: next.content }));
              heartbeatCounter = 0;
            } else {
              heartbeatCounter += 1;
              if (heartbeatCounter >= 15) {
                controller.enqueue(formatEvent({ type: "heartbeat" }));
                heartbeatCounter = 0;
              }
            }

            await sleep(1000);
          }
        } catch (error) {
          if (!closed) {
            controller.enqueue(
              formatEvent({
                type: "error",
                content: error instanceof Error ? error.message : "Failed to stream logs",
              })
            );
            close();
          }
        }
      })();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
    },
  });
}
