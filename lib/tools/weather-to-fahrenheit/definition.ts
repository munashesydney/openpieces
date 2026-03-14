import { z } from "zod";

export const weatherToFahrenheitToolDefinition = {
  description:
    "Convert Celsius weather temperatures to Fahrenheit. Use this when the user specifically asks for Fahrenheit.",
  inputSchema: z.object({
    temperatureCelsius: z.number().describe("The current temperature in Celsius."),
    feelsLikeCelsius: z
      .number()
      .optional()
      .describe("The feels-like temperature in Celsius, if available."),
    location: z.string().optional().describe("Optional location label to echo back."),
    condition: z.string().optional().describe("Optional condition label to echo back."),
  }),
};
