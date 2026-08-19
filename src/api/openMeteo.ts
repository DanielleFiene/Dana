import { chunk, getJson } from "@/api/http";
import { forecastSchema, patternSchema, type ForecastJson, type PatternJson } from "@/api/schemas";
import { isFiniteCoord } from "@/lib/geo";
import type { Coord } from "@/types/weather";

const FORECAST_ORIGIN = "https://api.open-meteo.com/v1/forecast";

/** Same hourly block as the live desk — historical replay must not drift. */
export const FORECAST_HOURLY = [
  "temperature_2m",
  "dew_point_2m",
  "relative_humidity_2m",
  "precipitation",
  "precipitation_probability",
  "cape",
  "lifted_index",
  "convective_inhibition",
  "temperature_850hPa",
  "relative_humidity_850hPa",
  "dew_point_850hPa",
  "temperature_500hPa",
  "geopotential_height_500hPa",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "wind_speed_850hPa",
  "wind_direction_850hPa",
  "wind_speed_700hPa",
  "soil_moisture_0_to_7cm",
  "weather_code",
  "total_column_integrated_water_vapour",
].join(",");

export const PATTERN_HOURLY = "temperature_500hPa,geopotential_height_500hPa";
export const ECMWF_IFS = "ecmwf_ifs025";

export type { Coord };

function forecastUrl(points: Coord[]): URL {
  const url = new URL(FORECAST_ORIGIN);
  url.searchParams.set("latitude", points.map((p) => p.lat.toFixed(4)).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lon.toFixed(4)).join(","));
  url.searchParams.set("hourly", FORECAST_HOURLY);
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("wind_speed_unit", "kmh");
  return url;
}

export async function fetchForecasts(points: Coord[]): Promise<ForecastJson[]> {
  const clean = points.filter((p) => isFiniteCoord(p.lat, p.lon));
  if (clean.length === 0) return [];
  const batches = chunk(clean, 6);
  const out: ForecastJson[] = [];
  for (const batch of batches) {
    const raw = await getJson(forecastUrl(batch));
    const list = Array.isArray(raw) ? raw : [raw];
    for (const item of list) {
      out.push(forecastSchema.parse(item));
    }
  }
  return out;
}

function patternUrl(points: Coord[]): URL {
  const url = new URL(FORECAST_ORIGIN);
  url.searchParams.set("latitude", points.map((p) => p.lat.toFixed(4)).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lon.toFixed(4)).join(","));
  url.searchParams.set("hourly", PATTERN_HOURLY);
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("models", ECMWF_IFS);
  return url;
}

/**
 * ECMWF IFS 0.25° 500 hPa. Best-effort: a miss must not take down the desk.
 * Rain stays on the local mix; this is only the cut-off.
 */
export async function fetchEcmwfPatterns(points: Coord[]): Promise<(PatternJson | null)[]> {
  const clean = points.filter((p) => isFiniteCoord(p.lat, p.lon));
  if (clean.length === 0) return [];
  try {
    const batches = chunk(clean, 6);
    const out: Array<PatternJson | null> = [];
    for (const batch of batches) {
      const raw = await getJson(patternUrl(batch));
      const list = Array.isArray(raw) ? raw : [raw];
      for (const item of list) {
        const parsed = patternSchema.safeParse(item);
        out.push(parsed.success ? parsed.data : null);
      }
    }
    return out;
  } catch {
    return clean.map(() => null);
  }
}
