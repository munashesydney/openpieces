import { tool } from "ai";
import { weatherToFahrenheitToolDefinition } from "./definition";
import { executeWeatherToFahrenheit } from "./execute";

export function createWeatherToFahrenheitTool() {
  return tool({
    ...weatherToFahrenheitToolDefinition,
    execute: executeWeatherToFahrenheit,
  });
}
