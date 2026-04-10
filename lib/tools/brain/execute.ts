import {
  getBrainEntries,
  getBrainEntryById,
  searchBrain,
  createBrainEntry,
  reinforceBrainEntry,
  deleteBrainEntry,
} from "@/lib/services/brain.service";
import type { ToolContext } from "@/lib/tools/registry";
import type { BrainToolInput } from "./definition";

export async function executeBrainTool(input: BrainToolInput, context: ToolContext) {
  const { action, query, page, limit, brainEntryId, summary, type, category, recordType, recordId, tags } = input;
  const { workspaceId } = context;

  if (!workspaceId) {
    throw new Error("Workspace ID is required in context");
  }

  switch (action) {
    case "list": {
      const result = await getBrainEntries(workspaceId, page ?? 1, limit ?? 10);
      return {
        ...result,
        data: result.data.map(({ embedding, ...rest }) => rest),
      };
    }

    case "search": {
      if (!query) {
        throw new Error("query is required for action 'search'");
      }
      const results = await searchBrain(query, workspaceId, limit ?? 10);
      return { 
        data: results.map(({ embedding, ...rest }) => rest), 
        total: results.length, 
        query 
      };
    }

    case "get": {
      if (!brainEntryId) {
        throw new Error("brainEntryId is required for action 'get'");
      }
      const entry = await getBrainEntryById(brainEntryId, workspaceId);
      if (!entry) {
        throw new Error(`Brain entry not found: ${brainEntryId}`);
      }
      const { embedding, ...rest } = entry;
      return rest;
    }

    case "create": {
      if (!summary) {
        throw new Error("summary is required for action 'create'");
      }
      const entry = await createBrainEntry({
        workspaceId,
        type: type ?? "fact",
        category: category ?? "general",
        summary,
        recordType: recordType ?? null,
        recordId: recordId ?? null,
        tags: tags,
      });
      return { success: true, brainEntryId: entry.id, message: "Brain entry created successfully" };
    }

    case "update": {
      if (!brainEntryId) {
        throw new Error("brainEntryId is required for action 'update'");
      }
      if (!summary) {
        throw new Error("summary is required for action 'update'");
      }
      const entry = await reinforceBrainEntry(brainEntryId, summary);
      if (!entry) {
        throw new Error(`Brain entry not found: ${brainEntryId}`);
      }
      return { success: true, brainEntryId: entry.id, confidence: entry.confidence, message: "Brain entry reinforced successfully" };
    }

    case "delete": {
      if (!brainEntryId) {
        throw new Error("brainEntryId is required for action 'delete'");
      }
      const deleted = await deleteBrainEntry(brainEntryId);
      if (!deleted) {
        throw new Error(`Brain entry not found: ${brainEntryId}`);
      }
      return { success: true, brainEntryId, message: "Brain entry deleted successfully" };
    }

    default: {
      throw new Error(
        `Unknown action: ${action}. Valid actions are: list, search, get, create, update, delete.`
      );
    }
  }
}
