import { createWeatherTool } from "@/lib/tools/weather";
import { createWeatherToFahrenheitTool } from "@/lib/tools/weather-to-fahrenheit";

export type ToolContext = {
  workspaceId: string;
  userId: string;
  chatId: string;
};

export function createTools(context: ToolContext) {
  void context;

  return {
    get_weather: createWeatherTool(),
    convert_weather_to_fahrenheit: createWeatherToFahrenheitTool(),
  };
}
