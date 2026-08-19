import { fetchMarineAll } from "@/api/marine";
import { fetchEcmwfPatterns, fetchForecasts } from "@/api/openMeteo";
import type { ForecastJson, MarineJson, PatternJson } from "@/api/schemas";
import { HOTSPOTS, SST_STATIONS, type Hotspot } from "@/data/hotspots";
import { atIndex } from "@/lib/array";
import { haversineKm, pointInRing } from "@/lib/geo";
import { groupDays, scoreSeries, windowPeak } from "@/scoring/score";
import type { PlaceKey, ScoredPlace, SstStationId } from "@/types/place";
import type { HourSample } from "@/types/weather";

export type { PlaceKey, ScoredPlace };

/** Either model seeing a colder 500 hPa pool is enough to flag a cut-off. */
export function pickColder(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

export function pickLowerHeight(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function patternAt(
  pattern: PatternJson | null | undefined,
  time: string,
  key: "temperature_500hPa" | "geopotential_height_500hPa",
): number | null {
  if (!pattern) return null;
  const i = pattern.hourly.time.indexOf(time);
  if (i < 0) return null;
  return pattern.hourly[key][i] ?? null;
}

export function sstAt(marine: MarineJson | undefined, time: string): number | null {
  if (!marine) return null;
  const i = marine.hourly.time.indexOf(time);
  if (i < 0) return marine.hourly.sea_surface_temperature[0] ?? null;
  return marine.hourly.sea_surface_temperature[i] ?? null;
}

export function samplesFromForecast(
  forecast: ForecastJson,
  sstFor: (time: string) => number | null,
  pattern?: PatternJson | null,
): HourSample[] {
  const h = forecast.hourly;
  return h.time.map((time, i) => ({
    time,
    temperature2m: atIndex(h.temperature_2m, i) ?? null,
    dewPoint2m: atIndex(h.dew_point_2m, i) ?? null,
    relativeHumidity2m: atIndex(h.relative_humidity_2m, i) ?? null,
    precipitation: atIndex(h.precipitation, i) ?? null,
    precipitationProbability: atIndex(h.precipitation_probability, i) ?? null,
    cape: atIndex(h.cape, i) ?? null,
    liftedIndex: atIndex(h.lifted_index, i) ?? null,
    convectiveInhibition: atIndex(h.convective_inhibition, i) ?? null,
    temperature850: atIndex(h.temperature_850hPa, i) ?? null,
    relativeHumidity850: atIndex(h.relative_humidity_850hPa, i) ?? null,
    dewPoint850: atIndex(h.dew_point_850hPa, i) ?? null,
    temperature500: pickColder(
      atIndex(h.temperature_500hPa, i) ?? null,
      patternAt(pattern, time, "temperature_500hPa"),
    ),
    geopotential500: pickLowerHeight(
      atIndex(h.geopotential_height_500hPa, i) ?? null,
      patternAt(pattern, time, "geopotential_height_500hPa"),
    ),
    windSpeed10m: atIndex(h.wind_speed_10m, i) ?? null,
    windDirection10m: atIndex(h.wind_direction_10m, i) ?? null,
    windGusts10m: atIndex(h.wind_gusts_10m, i) ?? null,
    windSpeed850: atIndex(h.wind_speed_850hPa, i) ?? null,
    windDirection850: atIndex(h.wind_direction_850hPa, i) ?? null,
    windSpeed700: atIndex(h.wind_speed_700hPa, i) ?? null,
    soilMoisture: atIndex(h.soil_moisture_0_to_7cm, i) ?? null,
    weatherCode: atIndex(h.weather_code, i) ?? null,
    sst: sstFor(time),
    pwat: atIndex(h.total_column_integrated_water_vapour, i) ?? null,
  }));
}

export function containingHotspot(lat: number, lon: number): Hotspot | undefined {
  return HOTSPOTS.find((h) => pointInRing(lon, lat, h.polygon));
}

export function nearestSstStation(lat: number, lon: number): SstStationId {
  let best: SstStationId = "golfo-valencia";
  let dist = Infinity;
  for (const s of SST_STATIONS) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (d < dist) {
      dist = d;
      best = s.id;
    }
  }
  return best;
}

export function placeFromHotspot(h: Hotspot): PlaceKey {
  return {
    id: h.id,
    name: h.name,
    lat: h.center.lat,
    lon: h.center.lon,
    hotspotId: h.id,
    sstStation: h.sstStation,
    floodProne: h.floodProne,
    onshoreFrom: h.onshoreFrom,
    onshoreTo: h.onshoreTo,
  };
}

export function placeFromCoord(id: string, name: string, lat: number, lon: number): PlaceKey {
  const host = containingHotspot(lat, lon);
  return {
    id,
    name,
    lat,
    lon,
    hotspotId: host?.id ?? null,
    sstStation: host?.sstStation ?? nearestSstStation(lat, lon),
    floodProne: host?.floodProne ?? false,
    onshoreFrom: host?.onshoreFrom ?? 45,
    onshoreTo: host?.onshoreTo ?? 135,
  };
}

export function scoreForecast(
  place: PlaceKey,
  forecast: ForecastJson,
  marine: MarineJson | undefined,
  pattern?: PatternJson | null,
): ScoredPlace {
  const samples = samplesFromForecast(forecast, (t) => sstAt(marine, t), pattern);
  const hours = scoreSeries(samples, place.floodProne, place.onshoreFrom, place.onshoreTo);
  const first = hours[0] ?? null;
  return {
    place,
    hours,
    days: groupDays(hours),
    now: first,
    next48: first ? windowPeak(hours, first.time, 48) : null,
    week: first ? windowPeak(hours, first.time, 24 * 7) : null,
  };
}

export async function loadHotspotDesk(): Promise<ScoredPlace[]> {
  const coords = HOTSPOTS.map((h) => ({ lat: h.center.lat, lon: h.center.lon }));
  const [marine, forecasts, patterns] = await Promise.all([
    fetchMarineAll(),
    fetchForecasts(coords),
    fetchEcmwfPatterns(coords),
  ]);
  return HOTSPOTS.map((h, i) => {
    const forecast = forecasts[i];
    if (!forecast) throw new Error(`Missing forecast for ${h.id}`);
    return scoreForecast(placeFromHotspot(h), forecast, marine[h.sstStation], patterns[i] ?? null);
  });
}

export async function loadOnePlace(place: PlaceKey): Promise<ScoredPlace> {
  const point = { lat: place.lat, lon: place.lon };
  const [forecasts, marine, patterns] = await Promise.all([
    fetchForecasts([point]),
    fetchMarineAll(),
    fetchEcmwfPatterns([point]),
  ]);
  const forecast = forecasts[0];
  if (!forecast) throw new Error("Missing forecast");
  return scoreForecast(place, forecast, marine[place.sstStation], patterns[0] ?? null);
}
