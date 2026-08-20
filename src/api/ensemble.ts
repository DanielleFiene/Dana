import { getJson } from "@/api/http";
import { isFiniteCoord } from "@/lib/geo";
import type { Coord } from "@/types/weather";

const ENSEMBLE_ORIGIN = "https://ensemble-api.open-meteo.com/v1/ensemble";
export const ECMWF_IFS_ENSEMBLE = "ecmwf_ifs025_ensemble";

/** Control `precipitation` plus precipitation_member01…50. */
export const ECMWF_ENS_MEMBERS = 51;

export function ensembleUrl(point: Coord, forecastDays = 1): URL {
  const url = new URL(ENSEMBLE_ORIGIN);
  url.searchParams.set("latitude", point.lat.toFixed(4));
  url.searchParams.set("longitude", point.lon.toFixed(4));
  url.searchParams.set("hourly", "precipitation");
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("models", ECMWF_IFS_ENSEMBLE);
  return url;
}

export function countPrecipMembers(hourly: Record<string, unknown>): number {
  return Object.keys(hourly).filter((k) => k === "precipitation" || /^precipitation_member\d+$/.test(k)).length;
}

/**
 * ECMWF IFS ENS via Open-Meteo: 51 members at 0.25° (~25 km), global, including Spain.
 * This is the only honest path to a chance figure. Do not show a % in the UI until
 * those members are calibrated on labelled DANA days with SAIH later.
 * SAIH does not admit AROME into the live score.
 */
export async function probeEcmwfEnsemble(point: Coord): Promise<{
  members: number;
  latitude: number;
  longitude: number;
}> {
  if (!isFiniteCoord(point.lat, point.lon)) {
    throw new Error("bad coord");
  }
  const raw = await getJson(ensembleUrl(point));
  if (!raw || typeof raw !== "object") throw new Error("empty ensemble");
  const body = raw as {
    latitude?: number;
    longitude?: number;
    hourly?: Record<string, unknown>;
  };
  const members = countPrecipMembers(body.hourly ?? {});
  return {
    members,
    latitude: body.latitude ?? point.lat,
    longitude: body.longitude ?? point.lon,
  };
}
