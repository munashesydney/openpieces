import { z } from "zod";

export const weatherToolDefinition = {
  description: "Get the current weather for a city or location. Returns Celsius temperatures.",
  inputSchema: z.object({
    location: z.string().min(1).describe("The city or location to look up."),
  }),
};
