import { tool } from "ai";
import { weatherToolDefinition } from "./definition";
import { executeWeather } from "./execute";

export function createWeatherTool() {
  return tool({
    ...weatherToolDefinition,
    execute: executeWeather,
  });
}
