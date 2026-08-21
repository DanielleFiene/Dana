import { getJson } from "@/api/http";
import { geocodeSchema } from "@/api/schemas";
import { sanitizeSearchQuery } from "@/lib/security";
import type { Lang } from "@/types/lang";
import type { PlaceHit } from "@/types/place";

const GEOCODE_ORIGIN = "https://geocoding-api.open-meteo.com/v1/search";

export type { PlaceHit };

function isSpain(countryCode: string | undefined): boolean {
  return countryCode?.toUpperCase() === "ES";
}

/** Mainland Spain, Balearics, Canaries, Ceuta and Melilla before anywhere else. */
export function preferSpanishHits<T extends { countryCode?: string }>(hits: readonly T[]): T[] {
  return [...hits].sort((a, b) => Number(isSpain(b.countryCode)) - Number(isSpain(a.countryCode)));
}

export async function searchPlaces(rawQuery: string, language: Lang): Promise<PlaceHit[]> {
  const q = sanitizeSearchQuery(rawQuery);
  if (q.length < 2) return [];
  const url = new URL(GEOCODE_ORIGIN);
  url.searchParams.set("name", q);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  const parsed = geocodeSchema.parse(await getJson(url, 4000, 0));
  const hits = (parsed.results ?? []).map((r) => ({
    id: `om-${String(r.id)}`,
    name: r.name,
    region: [r.admin2, r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude,
    countryCode: r.country_code,
  }));
  return preferSpanishHits(hits);
}
