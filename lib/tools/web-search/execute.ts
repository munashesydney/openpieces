import { tavily } from "@tavily/core";
import type { ToolContext } from "@/lib/tools/registry";
import type { WebSearchToolInput } from "./definition";

export async function executeWebSearchTool(input: WebSearchToolInput, context: ToolContext) {
  const { action, query, searchDepth, urls, site, maxDepth, maxResults } = input;

  const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

  switch (action) {
    case "search": {
      if (!query) {
        throw new Error("query is required for action 'search'");
      }
      const result = await client.search(query, {
        searchDepth: searchDepth === "advanced" ? "advanced" : "basic",
        maxResults: maxResults ?? 10,
      });
      return { success: true, action, result };
    }

    case "extract": {
      if (!urls || urls.length === 0) {
        throw new Error("urls are required for action 'extract'");
      }
      const result = await client.extract(urls);
      return { success: true, action, result };
    }

    case "crawl": {
      if (!urls || urls.length === 0) {
        throw new Error("urls are required for action 'crawl'");
      }
      const result = await client.crawl(urls[0], { maxDepth: maxDepth ?? 2 });
      return { success: true, action, result };
    }

    case "map": {
      if (!site) {
        throw new Error("site is required for action 'map'");
      }
      const result = await client.map(site, { maxDepth: maxDepth ?? 2 });
      return { success: true, action, result };
    }

    default: {
      throw new Error(`Unknown action: ${action}. Valid actions are: search, extract, crawl, map.`);
    }
  }
}