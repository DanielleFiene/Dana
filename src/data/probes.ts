import type { Coord } from "@/types/weather";

/** Town-scale Magre probes. The Utiel desk square sits west of the core. */
export const TURIS: Coord = { lat: 39.389, lon: -0.71 };
export const CHIVA: Coord = { lat: 39.471, lon: -0.72 };
/** Llevant core of 28 Oct 2024. The Mallorca desk square is scored at the island centre. */
export const PORTO_CRISTO: Coord = { lat: 39.544, lon: 3.337 };

/** Hand figures for the Magre core, not SAIH. AROME/ICON cells are still undercatch against this. */
export const MAGRE_CORE_OBSERVED = {
  dayMm: { from: 700, to: 770 },
  peakHourMm: 184,
} as const;
