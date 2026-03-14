type OpenMeteoGeocodingResponse = {
  results?: Array<{
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }>;
};

type OpenMeteoWeatherResponse = {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
};

export type CurrentWeather = {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  humidityPercent: number;
  windSpeedKph: number;
  condition: string;
};

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

function getWeatherCondition(weatherCode: number): string {
  return WEATHER_CODE_MAP[weatherCode] ?? "Unknown conditions";
}

export function convertCelsiusToFahrenheit(value: number): number {
  return Number(((value * 9) / 5 + 32).toFixed(1));
}

export async function getCurrentWeather(location: string): Promise<CurrentWeather> {
  const trimmedLocation = location.trim();
  if (!trimmedLocation) {
    throw new Error("A location is required.");
  }

  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", trimmedLocation);
  geocodeUrl.searchParams.set("count", "1");
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("format", "json");

  const geocodeResponse = await fetch(geocodeUrl, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!geocodeResponse.ok) {
    throw new Error("Unable to look up that location right now.");
  }

  const geocodeData = (await geocodeResponse.json()) as OpenMeteoGeocodingResponse;
  const match = geocodeData.results?.[0];

  if (!match) {
    throw new Error(`No weather location match found for "${trimmedLocation}".`);
  }

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(match.latitude));
  forecastUrl.searchParams.set("longitude", String(match.longitude));
  forecastUrl.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code"
  );
  forecastUrl.searchParams.set("timezone", "auto");

  const forecastResponse = await fetch(forecastUrl, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!forecastResponse.ok) {
    throw new Error("Unable to fetch current weather right now.");
  }

  const forecastData = (await forecastResponse.json()) as OpenMeteoWeatherResponse;
  const current = forecastData.current;

  if (!current) {
    throw new Error("Current weather data was unavailable for that location.");
  }

  const locationLabel = [match.name, match.admin1, match.country]
    .filter(Boolean)
    .join(", ");

  return {
    location: locationLabel,
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: match.timezone ?? null,
    temperatureCelsius: current.temperature_2m,
    feelsLikeCelsius: current.apparent_temperature,
    humidityPercent: current.relative_humidity_2m,
    windSpeedKph: current.wind_speed_10m,
    condition: getWeatherCondition(current.weather_code),
  };
}
