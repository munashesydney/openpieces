---
name: trigger-notifications
description: How trigger services notify the Events AI via notifyEventsAi when events occur
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  applies-to: trigger-services-only
---

## What I do

Trigger services receive inbound events (webhooks, polls) and forward them to the Events AI using a shared `notifyEventsAi` helper. This skill explains how to implement that notification correctly.

You can emit a named event (preferred) to fan out to all subscribed workflows, or target a specific workflow directly (legacy). Action services can also call `notifyEventsAi` to report notable events or errors back to the system.

## The notify helper

This is a Deno/TypeScript implementation. For Podman pieces (Python, Go, etc.), implement the same logic: POST to `${OPENPIECES_INTERNAL_URL}/api/internal/chat` with the `x-internal-secret` header set to `INTERNAL_API_KEY`.

### Deno — emit event by name (preferred)

Place this in a shared `notify.ts` file and import it from your service:

```ts
// notify.ts
export async function notifyEventsAi(
  content: string,
  options?: {
    chatId?: string | null;
    eventName?: string;
    eventPayload?: Record<string, unknown>;
  },
): Promise<void> {
  const workspaceId = Deno.env.get("OPENPIECES_WORKSPACE_ID")!;
  const userId = Deno.env.get("OPENPIECES_USER_ID")!;
  const serviceId = Deno.env.get("OPENPIECES_SERVICE_ID")!;
  const apiKey = Deno.env.get("INTERNAL_API_KEY")!;
  const internalUrl = Deno.env.get("OPENPIECES_INTERNAL_URL") ?? "http://app:3141";

  const enrichedContent = `[serviceId: ${serviceId}]\n${
    options?.eventName ? `[event: ${options.eventName}]` : ""
  }\n\n${content}`;

  const body: Record<string, unknown> = {
    workspaceId,
    userId,
    serviceId,
    content: enrichedContent,
    chatId: options?.chatId ?? null,
  };

  if (options?.eventName) body.eventName = options.eventName;
  if (options?.eventPayload) body.eventPayload = options.eventPayload;

  const res = await fetch(`${internalUrl}/api/internal/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Failed to notify orchestrator: ${res.status}`);
  }
}
```

### Deno — target specific workflow (legacy)

Use this only when you need to trigger exactly one workflow by ID:

```ts
// notify.ts
export async function notifyWorkflowDirectly(
  content: string,
  chatId?: string | null,
): Promise<void> {
  const workspaceId = Deno.env.get("OPENPIECES_WORKSPACE_ID")!;
  const userId = Deno.env.get("OPENPIECES_USER_ID")!;
  const serviceId = Deno.env.get("OPENPIECES_SERVICE_ID")!;
  const workflowId = Deno.env.get("OPENPIECES_WORKFLOW_ID") ?? "";
  const apiKey = Deno.env.get("INTERNAL_API_KEY")!;
  const internalUrl = Deno.env.get("OPENPIECES_INTERNAL_URL") ?? "http://app:3141";

  const enrichedContent = `[serviceId: ${serviceId}]\n[workflowId: ${workflowId}]\n\n${content}`;

  const res = await fetch(`${internalUrl}/api/internal/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": apiKey,
    },
    body: JSON.stringify({
      workspaceId,
      userId,
      workflowId,
      serviceId,
      chatId: chatId ?? null,
      content: enrichedContent,
    }),
  });

  if (!res.ok) {
    console.error(`Failed to notify orchestrator: ${res.status}`);
  }
}
```

## Message format

Concise but actionable — include the essential data only:

```
[serviceId: <OPENPIECES_SERVICE_ID>]
[event: stripe.payment_intent.succeeded]

Stripe webhook received: payment_intent.succeeded
amount: 4900
currency: usd
customer: cus_abc123
payment_intent: pi_xyz789
```

## chatId parameter

- Pass `chatId` to continue an existing OpenPieces conversation
- Pass `null` (or omit) to start a new conversation
- **IMPORTANT**: This is an OpenPieces chat ID — not a Telegram chat ID, not a Discord channel ID, not any external chat ID
- It is always optional; if you don't have it, don't pass it

## Processing flow

1. Receive inbound event (validate signatures, auth headers first)
2. Extract relevant fields
3. Call `notifyEventsAi` with a concise message containing the event details
4. Return appropriate HTTP response to the caller (200 for success)
