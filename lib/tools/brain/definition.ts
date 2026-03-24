import { z } from "zod";

export const brainToolDefinition = {
  name: "manage_brain",
  description:
    "Query, search, and manage the workspace brain for accumulated knowledge and facts. Use this to find information about past events, workflows, pieces, runs, and other workspace knowledge that has been summarized by the AI.",
  inputSchema: z.object({
    action: z
      .enum(["list", "search", "get", "create", "update"])
      .describe("The action to perform: list recent entries, search by query, get a specific entry, create a new entry, or update an existing entry"),
    // For list/search/get (existing):
    query: z
      .string()
      .optional()
      .describe("Search query for semantic search (finds entries by meaning, not just keywords)"),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number for list action"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Number of items per page for list action"),
    brainEntryId: z
      .string()
      .optional()
      .describe("Brain entry ID. Required for get and update actions."),
    // For create:
    summary: z
      .string()
      .optional()
      .describe("Summary/fact to store. Required for create action."),
    type: z
      .enum(["fact", "episode"])
      .optional()
      .describe("Type of brain entry: fact (single factual statement) or episode (complex multi-step event)"),
    category: z
      .enum(["pieces", "workflows", "runs", "credentials", "general"])
      .optional()
      .describe("Category for organizing entries"),
    recordType: z
      .string()
      .optional()
      .describe("Original record type this memory relates to"),
    recordId: z
      .string()
      .optional()
      .describe("Original record ID this memory relates to"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Tags for filtering and organization"),
  }),
};

export type BrainToolInput = z.infer<typeof brainToolDefinition.inputSchema>;
