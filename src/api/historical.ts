import { z } from "zod";
import { chunk, getJson } from "@/api/http";
import { ECMWF_IFS, FORECAST_HOURLY, PATTERN_HOURLY } from "@/api/openMeteo";
import {
  forecastSchema,
  marineSchema,
  patternSchema,
  type ForecastJson,
  type MarineJson,
  type PatternJson,
} from "@/api/schemas";
import { SST_STATIONS, type SstStationId } from "@/data/hotspots";
import { isFiniteCoord } from "@/lib/geo";
import type { Coord } from "@/types/weather";

const HIST_ORIGIN = "https://historical-forecast-api.open-meteo.com/v1/forecast";
const MARINE_ORIGIN = "https://marine-api.open-meteo.com/v1/marine";
const PREV_ORIGIN = "https://previous-runs-api.open-meteo.com/v1/forecast";
const HIST_TIMEOUT_MS = 25_000;

const numNullArr = z.array(z.union([z.number(), z.null()]));
const leadSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    precipitation: numNullArr,
    precipitation_previous_day1: numNullArr,
    precipitation_previous_day2: numNullArr,
    precipitation_previous_day3: numNullArr,
  }),
});

function setPoints(url: URL, points: Coord[]): void {
  url.searchParams.set("latitude", points.map((p) => p.lat.toFixed(4)).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lon.toFixed(4)).join(","));
}

function historicalForecastUrl(points: Coord[], startDate: string, endDate: string): URL {
  const url = new URL(HIST_ORIGIN);
  setPoints(url, points);
  url.searchParams.set("hourly", FORECAST_HOURLY);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("wind_speed_unit", "kmh");
  return url;
}

function historicalPatternUrl(points: Coord[], startDate: string, endDate: string): URL {
  const url = new URL(HIST_ORIGIN);
  setPoints(url, points);
  url.searchParams.set("hourly", PATTERN_HOURLY);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("models", ECMWF_IFS);
  return url;
}

function historicalMarineUrl(points: Coord[], startDate: string, endDate: string): URL {
  const url = new URL(MARINE_ORIGIN);
  setPoints(url, points);
  url.searchParams.set("hourly", "sea_surface_temperature");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("cell_selection", "sea");
  return url;
}

export async function fetchHistoricalForecasts(
  points: Coord[],
  startDate: string,
  endDate: string,
): Promise<ForecastJson[]> {
  const clean = points.filter((p) => isFiniteCoord(p.lat, p.lon));
  if (clean.length === 0) return [];
  const out: ForecastJson[] = [];
  for (const batch of chunk(clean, 6)) {
    const raw = await getJson(historicalForecastUrl(batch, startDate, endDate), HIST_TIMEOUT_MS);
    const list = Array.isArray(raw) ? raw : [raw];
    for (const item of list) out.push(forecastSchema.parse(item));
  }
  return out;
}

export async function fetchHistoricalEcmwfPatterns(
  points: Coord[],
  startDate: string,
  endDate: string,
): Promise<(PatternJson | null)[]> {
  const clean = points.filter((p) => isFiniteCoord(p.lat, p.lon));
  if (clean.length === 0) return [];
  try {
    const out: Array<PatternJson | null> = [];
    for (const batch of chunk(clean, 6)) {
      const raw = await getJson(historicalPatternUrl(batch, startDate, endDate), HIST_TIMEOUT_MS);
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

export async function fetchHistoricalMarine(
  startDate: string,
  endDate: string,
): Promise<Record<SstStationId, MarineJson>> {
  const map = {} as Record<SstStationId, MarineJson>;
  let offset = 0;
  for (const batch of chunk(SST_STATIONS, 6)) {
    const pts = batch.filter((s) => isFiniteCoord(s.lat, s.lon));
    const raw = await getJson(historicalMarineUrl(pts, startDate, endDate), HIST_TIMEOUT_MS);
    const list = Array.isArray(raw) ? raw : [raw];
    for (let i = 0; i < list.length; i += 1) {
      const station = SST_STATIONS[offset + i];
      if (station) map[station.id] = marineSchema.parse(list[i]);
    }
    offset += batch.length;
  }
  return map;
}

export type LeadPrecip = {
  analysisMm: number;
  lead24Mm: number;
  lead48Mm: number;
  lead72Mm: number;
};

const LEAD_HOURLY = [
  "precipitation",
  "precipitation_previous_day1",
  "precipitation_previous_day2",
  "precipitation_previous_day3",
].join(",");

function sumOnDate(times: string[], values: Array<number | null>, date: string): number {
  let sum = 0;
  for (let i = 0; i < times.length; i += 1) {
    const t = times[i];
    if (t?.startsWith(date)) sum += values[i] ?? 0;
  }
  return sum;
}

/**
 * Model rain at fixed lead times (Open-Meteo previous-runs).
 * Pressure-level DANA fields are not archived with this suffix, so this is
 * rain-only: would the millimetres have been enough, not the full score.
 */
export async function fetchLeadPrecip(point: Coord, date: string): Promise<LeadPrecip> {
  const url = new URL(PREV_ORIGIN);
  url.searchParams.set("latitude", point.lat.toFixed(4));
  url.searchParams.set("longitude", point.lon.toFixed(4));
  url.searchParams.set("hourly", LEAD_HOURLY);
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);
  url.searchParams.set("timezone", "Europe/Madrid");
  const raw = await getJson(url, HIST_TIMEOUT_MS);
  const parsed = leadSchema.parse(raw);
  const t = parsed.hourly.time;
  const h = parsed.hourly;
  return {
    analysisMm: sumOnDate(t, h.precipitation, date),
    lead24Mm: sumOnDate(t, h.precipitation_previous_day1, date),
    lead48Mm: sumOnDate(t, h.precipitation_previous_day2, date),
    lead72Mm: sumOnDate(t, h.precipitation_previous_day3, date),
  };
}
