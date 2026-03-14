import { getCurrentWeather } from "@/lib/services/weather.service";

export async function executeWeather(input: { location: string }) {
  return getCurrentWeather(input.location);
}
