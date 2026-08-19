import { chunk, getJson } from "@/api/http";
import { marineSchema, type MarineJson } from "@/api/schemas";
import { SST_STATIONS, type SstStationId } from "@/data/hotspots";
import { isFiniteCoord } from "@/lib/geo";

const MARINE_ORIGIN = "https://marine-api.open-meteo.com/v1/marine";

function marineUrl(points: { lat: number; lon: number }[]): URL {
  const url = new URL(MARINE_ORIGIN);
  url.searchParams.set("latitude", points.map((p) => p.lat.toFixed(4)).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lon.toFixed(4)).join(","));
  url.searchParams.set("hourly", "sea_surface_temperature");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("cell_selection", "sea");
  return url;
}

export async function fetchMarineAll(): Promise<Record<SstStationId, MarineJson>> {
  const batches = chunk(SST_STATIONS, 6);
  const map = {} as Record<SstStationId, MarineJson>;
  let offset = 0;
  for (const batch of batches) {
    const pts = batch.filter((s) => isFiniteCoord(s.lat, s.lon));
    const raw = await getJson(marineUrl(pts));
    const list = Array.isArray(raw) ? raw : [raw];
    for (let i = 0; i < list.length; i += 1) {
      const station = SST_STATIONS[offset + i];
      const parsed = marineSchema.parse(list[i]);
      if (station) map[station.id] = parsed;
    }
    offset += batch.length;
  }
  return map;
}
