import { getJson } from "@/api/http";
import { geocodeSchema } from "@/api/schemas";
import { sanitizeSearchQuery } from "@/lib/security";
import { inSpainFocus } from "@/lib/spain";
import type { Lang } from "@/types/lang";
import type { PlaceHit } from "@/types/place";

const GEOCODE_ORIGIN = "https://geocoding-api.open-meteo.com/v1/search";

export type { PlaceHit };

export async function searchPlaces(rawQuery: string, language: Lang): Promise<PlaceHit[]> {
  const q = sanitizeSearchQuery(rawQuery);
  if (q.length < 2) return [];
  const url = new URL(GEOCODE_ORIGIN);
  url.searchParams.set("name", q);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", language);
  url.searchParams.set("country", "ES");
  url.searchParams.set("format", "json");
  const parsed = geocodeSchema.parse(await getJson(url));
  return (parsed.results ?? [])
    .filter((r) => inSpainFocus(r.latitude, r.longitude) || r.country_code === "ES")
    .map((r) => ({
      id: `om-${String(r.id)}`,
      name: r.name,
      region: [r.admin2, r.admin1].filter(Boolean).join(", "),
      lat: r.latitude,
      lon: r.longitude,
    }));
}
