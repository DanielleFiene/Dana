/**
 * Magre-corridor CHJ stations to archive.
 *
 * Station codes come from mapa-lluvias / mapa-aforos (2026-08-21).
 * Numeric variable IDs are confirmed on chart-lluvia / aforo ficha the same
 * day — they can move, so harvest resolves them again each run.
 *
 * 0O04 is a station code, not a rain variable. The rain series is 13871
 * (5-min intensity). 13873 is caudal (m³/s), quantity "flow" — not stage.
 * mapa-aforos fldTNivel is null; do not invent a nivel id.
 *
 * Quantity labels match src/data/probes.ts: rain | flow. Never "stage".
 * The Magre nivel snapshot is MAGRE_POYO_STAGE; this archive is POYO_N3_CAUDAL.
 *
 * Do not fetch Magre 2024 through this API. That window is gone.
 */

export const CHJ_ORIGIN = "https://saih.chj.es";

export const CHJ_TZ = "Europe/Madrid";

/** Default cadence: 2 h. Lookback covers a long weekend of missed runs. */
export const DEFAULT_INTERVAL_MS = 2 * 60 * 60 * 1000;
export const DEFAULT_LOOKBACK_HOURS = 72;
export const DEFAULT_GAP_MS = 400;
export const DEFAULT_TIMEOUT_MS = 20_000;

export type SeriesKind = "rain-intensity" | "flow";
export type SaihQuantity = "rain" | "flow";

export type WantedRain = {
  id: "turis-rain" | "chiva-rain" | "utiel-rain" | "poyo-rain";
  stationCode: string;
  /** mapa-lluvias fldTNombre, for logs. Match is by stationCode. */
  name: string;
  kind: "rain-intensity";
  quantity: "rain";
  unit: "mm/h";
  /** Last confirmed chart-lluvia intensity id. Fallback if maps fail. */
  fallbackVariableId: string;
  fallbackStationId: string;
};

export type WantedFlow = {
  id: "poyo-flow";
  stationCode: string;
  name: string;
  kind: "flow";
  quantity: "flow";
  unit: "m³/s";
  fallbackVariableId: string;
  fallbackStationId: string;
};

export const WANTED_RAIN: readonly WantedRain[] = [
  {
    id: "turis-rain",
    stationCode: "7R04",
    name: "MC TURÍS",
    kind: "rain-intensity",
    quantity: "rain",
    unit: "mm/h",
    fallbackVariableId: "16922",
    fallbackStationId: "789",
  },
  {
    id: "chiva-rain",
    stationCode: "0P09",
    name: "CHIVA",
    kind: "rain-intensity",
    quantity: "rain",
    unit: "mm/h",
    fallbackVariableId: "14079",
    fallbackStationId: "371",
  },
  {
    id: "utiel-rain",
    stationCode: "0N01",
    name: "UTIEL",
    kind: "rain-intensity",
    quantity: "rain",
    unit: "mm/h",
    fallbackVariableId: "14433",
    fallbackStationId: "239",
  },
  {
    id: "poyo-rain",
    stationCode: "0O04",
    name: "MC RAMBLA POYO N-III",
    kind: "rain-intensity",
    quantity: "rain",
    unit: "mm/h",
    fallbackVariableId: "13871",
    fallbackStationId: "227",
  },
];

export const WANTED_FLOW: readonly WantedFlow[] = [
  {
    id: "poyo-flow",
    stationCode: "0O04",
    name: "MC RAMBLA POYO N-III",
    kind: "flow",
    quantity: "flow",
    unit: "m³/s",
    fallbackVariableId: "13873",
    fallbackStationId: "227",
  },
];

export type ResolvedSeries = {
  id: WantedRain["id"] | WantedFlow["id"];
  stationCode: string;
  stationId: string;
  stationName: string;
  variableId: string;
  kind: SeriesKind;
  quantity: SaihQuantity;
  unit: string;
  resolvedFrom: "live-map" | "fallback";
};

export function fallbackSeries(): ResolvedSeries[] {
  return [
    ...WANTED_RAIN.map((w) => ({
      id: w.id,
      stationCode: w.stationCode,
      stationId: w.fallbackStationId,
      stationName: w.name,
      variableId: w.fallbackVariableId,
      kind: w.kind,
      quantity: w.quantity,
      unit: w.unit,
      resolvedFrom: "fallback" as const,
    })),
    ...WANTED_FLOW.map((w) => ({
      id: w.id,
      stationCode: w.stationCode,
      stationId: w.fallbackStationId,
      stationName: w.name,
      variableId: w.fallbackVariableId,
      kind: w.kind,
      quantity: w.quantity,
      unit: w.unit,
      resolvedFrom: "fallback" as const,
    })),
  ];
}
