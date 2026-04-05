import { z } from "zod";

export const webSearchToolDefinition = {
  name: "web_search",
  description:
    "Search the web, extract content from URLs, crawl web pages, and map website structures using Tavily. Use this for real-time web search, fact-checking, content extraction, and website exploration.",
  inputSchema: z.object({
    action: z
      .enum(["search", "extract", "crawl", "map"])
      .describe("The action to perform: 'search' for web search, 'extract' for extracting content from URLs, 'crawl' for crawling web pages, 'map' for discovering pages on a website"),
    // For search:
    query: z
      .string()
      .optional()
      .describe("Search query for web search"),
    searchDepth: z
      .enum(["basic", "advanced"])
      .optional()
      .default("basic")
      .describe("Search depth: 'basic' for quick results, 'advanced' for deeper analysis"),
    // For extract and crawl:
    urls: z
      .array(z.string().url())
      .optional()
      .describe("Array of URLs to extract content from (for 'extract' action) or to crawl (for 'crawl' action)"),
    // For map:
    site: z
      .string()
      .optional()
      .describe("Website URL to map its structure (for 'map' action)"),
    maxDepth: z
      .number()
      .optional()
      .default(2)
      .describe("Maximum crawl depth for map action"),
    // For all:
    maxResults: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of results to return"),
  }),
};

export type WebSearchToolInput = z.infer<typeof webSearchToolDefinition.inputSchema>;