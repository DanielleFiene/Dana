import { z } from "zod";
import { isFiniteCoord } from "@/lib/geo";
import { sanitizePlaceName } from "@/lib/security";
import { isLang } from "@/types/lang";
import type { Lang } from "@/types/lang";
import type { SavedPlace } from "@/types/place";

const KEY = "dana.places.v1";
const LANG_KEY = "dana.lang.v1";
const MAX_PLACES = 8;

const savedSchema = z.object({
  id: z.string().max(64),
  name: z.string().max(48),
  lat: z.number(),
  lon: z.number(),
});

export type { SavedPlace };

function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function loadSavedPlaces(): SavedPlace[] {
  const parsed = z.array(savedSchema).safeParse(readRaw(KEY));
  if (!parsed.success) return [];
  return parsed.data.filter((p) => isFiniteCoord(p.lat, p.lon)).slice(0, MAX_PLACES);
}

export function persistSavedPlaces(places: SavedPlace[]): void {
  const clean = places
    .filter((p) => isFiniteCoord(p.lat, p.lon))
    .slice(0, MAX_PLACES)
    .map((p) => ({ ...p, name: sanitizePlaceName(p.name) || "Sitio" }));
  localStorage.setItem(KEY, JSON.stringify(clean));
}

export function loadLang(): Lang {
  const v = localStorage.getItem(LANG_KEY);
  return isLang(v) ? v : "es";
}

export function persistLang(lang: Lang): void {
  localStorage.setItem(LANG_KEY, lang);
}
