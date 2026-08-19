import { getJson } from "@/api/http";
import { z } from "zod";

const frameSchema = z.object({
  time: z.number(),
  path: z.string(),
});

const mapsSchema = z.object({
  host: z.string(),
  radar: z.object({
    past: z.array(frameSchema),
  }),
});

/** RainViewer free tiles stop at zoom 7. Higher zooms return a “not supported” image. */
export const RADAR_MAX_ZOOM = 7;
/** Universal blue — the scheme the free API documents. */
const RADAR_COLOR = 2;
const RADAR_OPTIONS = "0_0";

export function radarTileUrl(host: string, path: string): string {
  const base = host.replace(/\/$/u, "");
  return `${base}${path}/256/{z}/{x}/{y}/${String(RADAR_COLOR)}/${RADAR_OPTIONS}.png`;
}

/** RainViewer public radar (no key). Last ~90 minutes, 10-minute steps. */
export async function fetchRadarTileTemplates(): Promise<string[]> {
  const raw = await getJson(new URL("https://api.rainviewer.com/public/weather-maps.json"), 6000);
  const parsed = mapsSchema.parse(raw);
  const frames = parsed.radar.past.slice(-9);
  return frames.map((f) => radarTileUrl(parsed.host, f.path));
}
