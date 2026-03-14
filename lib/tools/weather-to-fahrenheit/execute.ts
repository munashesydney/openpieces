import { convertCelsiusToFahrenheit } from "@/lib/services/weather.service";

type WeatherToFahrenheitInput = {
  temperatureCelsius: number;
  feelsLikeCelsius?: number;
  location?: string;
  condition?: string;
};

export async function executeWeatherToFahrenheit(input: WeatherToFahrenheitInput) {
  return {
    location: input.location ?? null,
    condition: input.condition ?? null,
    temperatureFahrenheit: convertCelsiusToFahrenheit(input.temperatureCelsius),
    feelsLikeFahrenheit:
      input.feelsLikeCelsius == null
        ? null
        : convertCelsiusToFahrenheit(input.feelsLikeCelsius),
  };
}
