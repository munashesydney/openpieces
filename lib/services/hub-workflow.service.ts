import { cookies } from "next/headers";
import { getServiceById } from "./service.service";
import { getEndpointsByServiceId } from "./service-endpoint.service";
import { getRequiredSecrets } from "./service-required-secrets.service";
import { downloadServiceCode } from "./service.service";
import { getTasksByWorkflowId } from "./task.service";
import { getActionServicesForWorkflow } from "./workflow-action.service";
import {
  getStoredToken,
  getAuthorizeUrl,
  pushPiece,
  fetchPieceById,
  downloadPieceZip,
  type HubPiece,
} from "./hub.service";
import {
  writeServiceCode,
  createService,
  updateServiceMetadata,
} from "./service.service";
import { createEndpoint } from "./service-endpoint.service";
import {
  addRequiredSecret,
  removeRequiredSecret,
} from "./service-required-secrets.service";
import { createSecret } from "./secret.service";
import { requireUser } from "./auth.service";

const HUB_URL = process.env.OPENPIECES_HUB_URL ?? "http://localhost:3000";
const SERVER_URL = HUB_URL.replace("localhost", "host.docker.internal");

// ── Types ──────────────────────────────────────

export type HubWorkflow = {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: "active" | "archived";
  detailedSteps: string[];
  stars: number;
  installCount: number;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  services: Array<{
    id: string;
    pieceId: string;
    role: "trigger" | "action";
    createdAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    type: "one-time" | "recurring";
    scheduledAt: string | null;
    intervalType: string | null;
    intervalValue: number | null;
    dayOfWeek: number | null;
    dayOfMonth: number | null;
    timeOfDay: string | null;
    timezone: string | null;
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
    runOnDays: number[];
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    eventName: string;
    description: string;
    createdAt: string;
  }>;
};

export type SearchWorkflowsResult = {
  workflows: Array<
    HubWorkflow & {
      serviceCount: number;
      taskCount: number;
      eventCount: number;
    }
  >;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── Shared: sync a hub piece into a local service ──

/**
 * Download a piece from the hub, write its code, replace endpoints
 * and required secrets, and update hub-link metadata on a local service.
 *
 * Used by both single-service pull and workflow pull to avoid duplication.
 */
export async function syncPieceToLocalService(
  piece: HubPiece,
  target: {
    serviceId: string;
    directory: string;
    workspaceId: string;
  },
  userId: string,
): Promise<void> {
  // 1. Download ZIP
  const zipBuffer = await downloadPieceZip(piece.codeUrl);
  if (!zipBuffer) {
    throw new Error(`Failed to download code for "${piece.title}"`);
  }

  // 2. Write code to directory
  await writeServiceCode(target.directory, zipBuffer, {
    serviceId: target.serviceId,
    workspaceId: target.workspaceId,
  });

  // 3. Replace endpoints (delete all, create fresh)
  const { deleteEndpointsByServiceId } =
    await import("./service-endpoint.service");
  await deleteEndpointsByServiceId(target.serviceId);
  if (piece.endpoints && piece.endpoints.length > 0) {
    await Promise.all(
      piece.endpoints.map((ep) =>
        createEndpoint({
          serviceId: target.serviceId,
          method: ep.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
          path: ep.path,
          description: ep.description ?? "",
          inputSchema: (ep.inputSchema ?? {}) as Record<string, unknown>,
        }),
      ),
    );
  }

  // 4. Replace required secrets (delete all, create fresh)
  const { deleteRequiredSecretsByServiceId } =
    await import("./service-required-secrets.service");
  await deleteRequiredSecretsByServiceId(target.serviceId);
  if (piece.requiredSecrets && piece.requiredSecrets.length > 0) {
    await Promise.all(
      piece.requiredSecrets.map(async (s) => {
        try {
          await createSecret({
            workspaceId: target.workspaceId,
            userId,
            key: s.secretKey,
            value: "",
            allowEmptyValue: true,
          });
        } catch {
          // Secret already exists
        }
        await addRequiredSecret(target.serviceId, s.secretKey);
      }),
    );
  }

  // 5. Update hub-link metadata
  await updateServiceMetadata(target.serviceId, target.workspaceId, {
    title: piece.title,
    description: piece.description,
    hubPieceId: piece.id,
    hubUpdatedAt: piece.updatedAt ? new Date(piece.updatedAt) : undefined,
  });
}

// ── Push a workflow to the hub ─────────────────

export type PushWorkflowResult =
  | { ok: true; hubWorkflowId: string }
  | { ok: false; error: string; notOwner?: boolean }
  | { redirectUrl: string };

/**
 * Push an entire workflow (with all linked services + tasks) to the hub.
 *
 * Strategy:
 * 1. For each linked service, push it as a piece (reusing pushPiece from hub.service.ts).
 * 2. Collect the returned hub pieceIds.
 * 3. Register the workflow on the hub with piece refs + task configs.
 */
export async function pushWorkflow(
  token: string,
  data: {
    workspaceId: string;
    workflow: {
      id: string;
      title: string;
      description: string;
      status: string;
      detailedSteps: string[];
    };
    services: Array<{
      id: string;
      title: string;
      description: string;
      type: "trigger" | "action";
      hubPieceId: string | null;
    }>;
    tasks: Array<{
      title: string;
      description: string;
      type: "one-time" | "recurring";
      scheduledAt: string | null;
      intervalType: string | null;
      intervalValue: number | null;
      dayOfWeek: number | null;
      dayOfMonth: number | null;
      timeOfDay: string | null;
      timezone: string | null;
      timeWindowStart: string | null;
      timeWindowEnd: string | null;
      runOnDays: number[];
    }>;
    events: Array<{
      eventName: string;
      description: string;
    }>;
  },
): Promise<PushWorkflowResult> {
  // ── Step 1: Push each service as a piece ────
  const servicePieces: Array<{
    pieceId: string;
    role: "trigger" | "action";
  }> = [];

  for (const svc of data.services) {
    // Download service code
    let zipBuffer: Buffer;
    try {
      zipBuffer = await downloadServiceCode(svc.id, data.workspaceId);
    } catch {
      return {
        ok: false,
        error: `Failed to read code for service "${svc.title}"`,
      };
    }

    // Fetch endpoints + secrets
    const [endpoints, secrets] = await Promise.all([
      getEndpointsByServiceId(svc.id, data.workspaceId),
      getRequiredSecrets(svc.id),
    ]);

    const pieceResult = await pushPiece(token, {
      title: svc.title,
      description: svc.description,
      zipBuffer,
      filename: `${svc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`,
      pieceId: svc.hubPieceId ?? undefined,
      category: svc.type === "trigger" ? "TRIGGER" : "ACTION",
      endpoints: endpoints.map((e) => ({
        method: e.method,
        path: e.path,
        description: e.description,
        inputSchema: (e.inputSchema ?? {}) as Record<string, unknown>,
      })),
      requiredSecrets: secrets.map((s) => ({ secretKey: s.secretKey })),
    });

    if (pieceResult.notOwner) {
      return {
        ok: false,
        notOwner: true,
        error: `You don't own "${svc.title}" on the hub`,
      };
    }

    if (!pieceResult.ok || !pieceResult.hubPieceId) {
      return {
        ok: false,
        error: pieceResult.error ?? `Failed to push service "${svc.title}"`,
      };
    }

    servicePieces.push({
      pieceId: pieceResult.hubPieceId,
      role: svc.type,
    });

    // Update local service with hub piece id
    await updateServiceMetadata(svc.id, data.workspaceId, {
      hubPieceId: pieceResult.hubPieceId,
      hubUpdatedAt: pieceResult.hubUpdatedAt
        ? new Date(pieceResult.hubUpdatedAt)
        : undefined,
    });
  }

  // ── Step 2: Register the workflow on the hub ──
  const registerForm = new FormData();
  registerForm.append("title", data.workflow.title);
  registerForm.append("description", data.workflow.description);
  registerForm.append("status", data.workflow.status);
  registerForm.append(
    "detailedSteps",
    JSON.stringify(data.workflow.detailedSteps),
  );
  registerForm.append("services", JSON.stringify(servicePieces));
  registerForm.append("tasks", JSON.stringify(data.tasks));
  registerForm.append("events", JSON.stringify(data.events));

  // If workflow already has a hubWorkflowId, send it for update
  const { getWorkflowById } = await import("@/lib/services/workflow.service");
  const localWorkflow = await getWorkflowById(
    data.workflow.id,
    data.workspaceId,
  );
  if (localWorkflow?.hubWorkflowId) {
    registerForm.append("workflowId", localWorkflow.hubWorkflowId);
  }

  const res = await fetch(`${SERVER_URL}/api/v1/oauth/workflows`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: registerForm,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    return { ok: false, error: err.error ?? "Failed to push workflow" };
  }

  const hubWorkflow = (await res.json()) as { id: string };

  return { ok: true, hubWorkflowId: hubWorkflow.id };
}

// ── Search hub workflows ──────────────────────

export async function searchHubWorkflows(
  query: string,
  options?: { page?: number; limit?: number },
): Promise<SearchWorkflowsResult> {
  const url = new URL("/api/v1/oauth/workflows", SERVER_URL);
  url.searchParams.set("search", query);
  url.searchParams.set("page", String(options?.page ?? 1));
  url.searchParams.set("limit", String(options?.limit ?? 20));

  const res = await fetch(url.toString());
  if (!res.ok) {
    return {
      workflows: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  }

  return res.json() as Promise<SearchWorkflowsResult>;
}

// ── Fetch hub workflow by ID ──────────────────

export async function fetchHubWorkflowById(
  id: string,
): Promise<HubWorkflow | null> {
  const res = await fetch(`${SERVER_URL}/api/v1/oauth/workflows/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<HubWorkflow>;
}

// ── Pull a workflow from the hub ───────────────

export type PullWorkflowResult =
  | { ok: true }
  | { ok: false; error: string }
  | { redirectUrl: string };

/**
 * Pull a workflow from the hub into the local workspace:
 * 1. Fetch workflow metadata + linked pieces + tasks
 * 2. For each linked piece, download code + create/replace local service
 * 3. Create/replace the local workflow
 * 4. Create/replace local tasks
 */
export async function pullWorkflow(
  token: string,
  data: {
    workspaceId: string;
    userId: string;
    hubWorkflowId: string;
    existingWorkflowId?: string;
  },
): Promise<PullWorkflowResult> {
  // 1. Fetch workflow from hub
  const hubWf = await fetchHubWorkflowById(data.hubWorkflowId);
  if (!hubWf) {
    return { ok: false, error: "Workflow not found on hub" };
  }

  // 2. Sync all linked hub pieces to local services (create or refresh)
  const user = await requireUser();
  const localServiceIds: Array<{ serviceId: string; role: string }> = [];

  for (const link of hubWf.services) {
    const piece = await fetchPieceById(link.pieceId);
    if (!piece) {
      return {
        ok: false,
        error: `Piece ${link.pieceId} not found on hub`,
      };
    }

    // Check if a local service already exists for this hub piece
    const { getServiceByHubPieceId } = await import("./service.service");
    const existing = await getServiceByHubPieceId(piece.id, data.workspaceId);

    let localServiceId: string;
    let directory: string;

    if (existing) {
      // Refresh existing service in-place
      localServiceId = existing.id;
      directory = existing.directory!;
    } else {
      // Create a brand new local service
      const serviceSlug = `${piece.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

      const { createService } = await import("./service.service");
      const localService = await createService({
        workspaceId: data.workspaceId,
        workflowId:
          link.role === "trigger" ? (data.existingWorkflowId ?? null) : null,
        title: piece.title,
        description: piece.description,
        type: link.role,
        directory: serviceSlug,
      });

      localServiceId = localService.id;
      directory = localService.directory!;
    }

    // Sync the hub piece into the local service
    try {
      await syncPieceToLocalService(
        piece,
        { serviceId: localServiceId, directory, workspaceId: data.workspaceId },
        user.id,
      );
    } catch (err) {
      return {
        ok: false,
        error: `Failed to sync "${piece.title}": ${(err as Error).message}`,
      };
    }

    localServiceIds.push({
      serviceId: localServiceId,
      role: link.role,
    });
  }

  // 3. Create or update the local workflow
  const { createWorkflow, updateWorkflow } = await import("./workflow.service");

  const targetWorkflowId = data.existingWorkflowId;
  let finalWorkflowId = targetWorkflowId;

  if (targetWorkflowId) {
    await updateWorkflow(targetWorkflowId, data.workspaceId, {
      title: hubWf.title,
      description: hubWf.description,
      status: hubWf.status,
      detailedSteps: hubWf.detailedSteps,
      hubWorkflowId: hubWf.id,
      hubUpdatedAt: hubWf.updatedAt ? new Date(hubWf.updatedAt) : undefined,
    });

    // Link action services to the existing workflow
    for (const ls of localServiceIds) {
      if (ls.role === "action") {
        const { linkActionServiceToWorkflow } =
          await import("./workflow-action.service");
        try {
          await linkActionServiceToWorkflow(
            targetWorkflowId,
            ls.serviceId,
            data.workspaceId,
          );
        } catch {
          // Already linked
        }
      } else {
        // Ensure trigger services point to the existing workflow
        const { updateServiceMetadata: updateSvc } =
          await import("./service.service");
        await updateSvc(ls.serviceId, data.workspaceId, {
          workflowId: targetWorkflowId,
        }).catch(() => {});
      }
    }

    // Create tasks
    if (hubWf.tasks.length > 0) {
      const { createTask } = await import("./task.service");
      for (const t of hubWf.tasks) {
        await createTask({
          workspaceId: data.workspaceId,
          workflowId: targetWorkflowId,
          title: t.title,
          description: t.description,
          type: t.type,
          scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : undefined,
          intervalType: t.intervalType as
            | "minutes"
            | "hours"
            | "daily"
            | "weekly"
            | "monthly"
            | null,
          intervalValue: t.intervalValue,
          dayOfWeek: t.dayOfWeek,
          dayOfMonth: t.dayOfMonth,
          timeOfDay: t.timeOfDay,
          timezone: t.timezone ?? "UTC",
          timeWindowStart: t.timeWindowStart ?? undefined,
          timeWindowEnd: t.timeWindowEnd ?? undefined,
          runOnDays: t.runOnDays ?? undefined,
        });
      }
    }
  } else {
    // Create the workflow
    const newWf = await createWorkflow({
      workspaceId: data.workspaceId,
      title: hubWf.title,
      description: hubWf.description,
      status: hubWf.status,
      detailedSteps: hubWf.detailedSteps,
      hubWorkflowId: hubWf.id,
      hubUpdatedAt: hubWf.updatedAt ? new Date(hubWf.updatedAt) : undefined,
    });

    finalWorkflowId = newWf.id;

    // Link services back to the new workflow
    if (newWf) {
      for (const ls of localServiceIds) {
        if (ls.role === "action") {
          const { linkActionServiceToWorkflow } =
            await import("./workflow-action.service");
          try {
            await linkActionServiceToWorkflow(
              newWf.id,
              ls.serviceId,
              data.workspaceId,
            );
          } catch {
            // Already linked or not an action — fine
          }
        }
      }

      // Link trigger service back to the new workflow
      const { updateServiceMetadata: updateSvc } =
        await import("./service.service");
      for (const ls of localServiceIds) {
        if (ls.role === "trigger") {
          await updateSvc(ls.serviceId, data.workspaceId, {
            workflowId: newWf.id,
          }).catch(() => {});
        }
      }

      // Create tasks
      if (hubWf.tasks.length > 0) {
        const { createTask } = await import("./task.service");
        for (const t of hubWf.tasks) {
          await createTask({
            workspaceId: data.workspaceId,
            workflowId: newWf.id,
            title: t.title,
            description: t.description,
            type: t.type,
            scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : undefined,
            intervalType: t.intervalType as
              | "minutes"
              | "hours"
              | "daily"
              | "weekly"
              | "monthly"
              | null,
            intervalValue: t.intervalValue,
            dayOfWeek: t.dayOfWeek,
            dayOfMonth: t.dayOfMonth,
            timeOfDay: t.timeOfDay,
            timezone: t.timezone ?? "UTC",
            timeWindowStart: t.timeWindowStart ?? undefined,
            timeWindowEnd: t.timeWindowEnd ?? undefined,
            runOnDays: t.runOnDays ?? undefined,
          });
        }
      }
    }
  }

  // 5. Restore events and subscriptions (for both new and updated workflows)
  if (hubWf.events.length > 0 && finalWorkflowId) {
    const {
      createEvent: createEventSvc,
      subscribeWorkflowToEvent: subscribeWfToEvent,
    } = await import("./event.service");

    for (const ev of hubWf.events) {
      // Create event if it doesn't exist yet
      let localEventId: string;
      try {
        const localEvent = await createEventSvc({
          workspaceId: data.workspaceId,
          eventName: ev.eventName,
          description: ev.description,
        });
        localEventId = localEvent.id;
      } catch (err: unknown) {
        const isDuplicate =
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "23505";
        if (!isDuplicate) {
          console.error(`Failed to create event ${ev.eventName}:`, err);
          continue;
        }
        // Event already exists — look it up
        const { getEventByName } = await import("./event.service");
        const existing = await getEventByName(data.workspaceId, ev.eventName);
        if (!existing) continue;
        localEventId = existing.id;
      }

      // Subscribe the workflow to the event
      try {
        await subscribeWfToEvent(
          finalWorkflowId,
          localEventId,
          data.workspaceId,
        );
      } catch (err: unknown) {
        const isDuplicate =
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "23505";
        if (!isDuplicate) {
          console.error(
            `Failed to subscribe ${finalWorkflowId} to ${ev.eventName}:`,
            err,
          );
        }
      }
    }
  }

  return { ok: true };
}
