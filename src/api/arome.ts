import { chunk, getJson } from "@/api/http";
import { FORECAST_HOURLY } from "@/api/openMeteo";
import { forecastSchema, type ForecastJson } from "@/api/schemas";
import { isFiniteCoord } from "@/lib/geo";
import type { Coord } from "@/types/weather";

/** Live Météo-France endpoint. Do not use best_match — Spain then falls back to ICON 7 km. */
export const METEOFRANCE_ORIGIN = "https://api.open-meteo.com/v1/meteofrance";
export const AROME_FRANCE = "arome_france";

export function aromeForecastUrl(points: Coord[], forecastDays = 2): URL {
  const url = new URL(METEOFRANCE_ORIGIN);
  url.searchParams.set("latitude", points.map((p) => p.lat.toFixed(4)).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lon.toFixed(4)).join(","));
  url.searchParams.set("hourly", FORECAST_HOURLY);
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("models", AROME_FRANCE);
  return url;
}

export function aromeInDomain(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const lat = (raw as { latitude?: unknown }).latitude;
  return typeof lat === "number" && Number.isFinite(lat);
}

/**
 * Explicit AROME France (~2.5 km, ~2-day horizon). Out-of-domain points
 * (Málaga, Almería, Gibraltar) come back as NaN JSON — skip those coords.
 */
export async function fetchAromeForecasts(points: Coord[]): Promise<Array<ForecastJson | null>> {
  const clean = points.filter((p) => isFiniteCoord(p.lat, p.lon));
  if (clean.length === 0) return [];
  const out: Array<ForecastJson | null> = [];
  for (const batch of chunk(clean, 6)) {
    const raw = await getJson(aromeForecastUrl(batch));
    const list = Array.isArray(raw) ? raw : [raw];
    for (const item of list) {
      if (!aromeInDomain(item)) {
        out.push(null);
        continue;
      }
      const parsed = forecastSchema.safeParse(item);
      out.push(parsed.success ? parsed.data : null);
    }
  }
  return out;
}

export function aromePrecipAvailable(forecast: ForecastJson | null | undefined): boolean {
  if (!forecast) return false;
  return forecast.hourly.precipitation.some((v) => v !== null);
}
