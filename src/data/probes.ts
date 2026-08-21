import type { Coord } from "@/types/weather";

/** Town-scale Magre probes. The Utiel desk square sits west of the core. */
export const TURIS: Coord = { lat: 39.389, lon: -0.71 };
export const CHIVA: Coord = { lat: 39.471, lon: -0.72 };
/** Llevant core of 28 Oct 2024. The Mallorca desk square is scored at the island centre. */
export const PORTO_CRISTO: Coord = { lat: 39.544, lon: 3.337 };

/** CHJ SAIH stations — UTM 30N from saih.chj.es, converted to WGS84. */
export const SAIH_CHIVA: Coord = { lat: 39.4575, lon: -0.7355 };
export const SAIH_REAL: Coord = { lat: 39.3215, lon: -0.5829 };
export const SAIH_FORATA: Coord = { lat: 39.3405, lon: -0.8644 };
export const SAIH_REQUENA: Coord = { lat: 39.478, lon: -1.1165 };
export const SAIH_POYO_N3: Coord = { lat: 39.4734, lon: -0.5841 };

/**
 * AEMET Turís, 29 Oct 2024 — not SAIH. 771.24 mm in 14 h, peak hour 184.6 mm.
 * Hand range kept as the core undercatch figure already in the desk.
 * Window is peak-hours on the 29th, not an 8-day episode sum.
 */
export const MAGRE_CORE_OBSERVED = {
  source: "aemet",
  station: "Turís",
  window: {
    kind: "peak-hours",
    hours: 14,
    date: "2024-10-29",
    comparableToModelDay: false,
  },
  dayMm: { from: 700, to: 770 },
  peakHourMm: 184.6,
} as const;

/**
 * CHJ SAIH published rain table window. Inclusive 28 Oct 00:00 to exclusive
 * 5 Nov 00:00 = 8 local days. Totals include wet hours around the Magre peak.
 * Do not compare `mm` to a single model-run day.
 */
export const MAGRE_SAIH_EPISODE = {
  source: "chj-saih",
  report: "20241029-1104Informe-Episodio-C-version2.pdf",
  window: {
    kind: "episode-sum",
    days: 8,
    from: "2024-10-28 00:00",
    to: "2024-11-05 00:00",
    timezone: "Europe/Madrid",
    comparableToModelDay: false,
  },
} as const;

/**
 * Physical quantity at a SAIH station. Rain, stage (nivel, m) and flow
 * (caudal, m³/s) are not interchangeable. "We have Poyo data" is not a kind.
 */
export type SaihQuantity = "rain" | "stage" | "flow";

export type MagreSaihRainProbe = {
  id: "chiva" | "real" | "forata" | "requena" | "poyo-rain";
  quantity: "rain";
  name: string;
  code: string;
  mm: number;
  coord: Coord;
  window: (typeof MAGRE_SAIH_EPISODE)["window"];
};

/**
 * Independent SAIH rain totals on Magre. Each row carries the 8-day episode
 * window next to `mm` so a later day-vs-gauge compare cannot miss it.
 */
export const MAGRE_SAIH_RAIN: readonly MagreSaihRainProbe[] = [
  { id: "chiva", quantity: "rain", name: "Chiva", code: "0P09", mm: 621, coord: SAIH_CHIVA, window: MAGRE_SAIH_EPISODE.window },
  { id: "real", quantity: "rain", name: "Marco en Real", code: "7O09", mm: 545.3, coord: SAIH_REAL, window: MAGRE_SAIH_EPISODE.window },
  { id: "forata", quantity: "rain", name: "Embalse de Forata", code: "7E03", mm: 320, coord: SAIH_FORATA, window: MAGRE_SAIH_EPISODE.window },
  { id: "requena", quantity: "rain", name: "EA 60 Requena", code: "5A02", mm: 273.4, coord: SAIH_REQUENA, window: MAGRE_SAIH_EPISODE.window },
  { id: "poyo-rain", quantity: "rain", name: "Marco rambla del Poyo N-III", code: "0O04", mm: 240.2, coord: SAIH_POYO_N3, window: MAGRE_SAIH_EPISODE.window },
];

/**
 * Poyo stage (nivel), not rain and not caudal. Last good water level in the
 * Magre episode report before the sensor was lost. Truncated hydrograph.
 * There is no public CHJ nivel series to harvest — mapa-aforos fldTNivel is null.
 */
export const MAGRE_POYO_STAGE = {
  id: "poyo-stage",
  quantity: "stage",
  unit: "m",
  name: "Rambla del Poyo N-III",
  code: "0O04",
  coord: SAIH_POYO_N3,
  lostAtLocal: "2024-10-29 18:55",
  lastLevelM: 4.899,
  publicSeries: false,
  note: "Nivel snapshot from the Magre episode report. Incomplete hydrograph, not rain, not the live 13873 caudal series.",
} as const;

/**
 * Last caudal printed in the Magre episode report at the same clock as the
 * stage snapshot. Not a flow time series, not variable 13873, not stage.
 */
export const MAGRE_POYO_FLOW_AT_LOSS = {
  id: "poyo-flow-at-loss",
  quantity: "flow",
  unit: "m³/s",
  name: "Rambla del Poyo N-III",
  code: "0O04",
  coord: SAIH_POYO_N3,
  lostAtLocal: MAGRE_POYO_STAGE.lostAtLocal,
  lastFlowM3s: 2282.9,
  publicSeries: false,
  sameInstantAs: MAGRE_POYO_STAGE.id,
  note: "Caudal snapshot from the Magre episode report at sensor loss. Do not file as MAGRE_POYO_STAGE or as POYO_N3_CAUDAL.",
} as const;

/**
 * Live public CHJ aforo at Poyo N-III. Confirmed on mapa-aforos 2026-08-21:
 * variable 13873, CAUDAL RAMBLA DE POYO, m³/s. Not nivel.
 * A later event's peak flow can proxy the collapse time without a stage series.
 * Do not store or cite this under a MAGRE_POYO_STAGE-shaped label.
 */
export const POYO_N3_CAUDAL = {
  id: "poyo-flow",
  quantity: "flow",
  unit: "m³/s",
  name: "MC RAMBLA POYO N-III",
  code: "0O04",
  stationId: "227",
  variableId: "13873",
  coord: SAIH_POYO_N3,
  publicSeries: true,
  note: "Live CHJ caudal archive (saih:chj). Not stage. fldTNivel is null on the public ficha.",
} as const;

/** Guadalhorce at Cártama town — west of the Málaga desk-square centre. */
export const SAIH_CARTAMA: Coord = { lat: 36.737, lon: -4.632 };

/**
 * Hidrosur Cártama pluvio. 24 h Europe/Madrid on the labelled 13 Nov day
 * *is* comparable to a model calendar day. The 5-day 11–15 Nov sum is not.
 * Not CHG.
 */
export const CARTAMA_SAIH_RAIN = {
  id: "cartama-rain",
  quantity: "rain" as const,
  source: "hidrosur",
  name: "Río Guadalhorce (Cártama)",
  code: "038P01",
  coord: SAIH_CARTAMA,
  window: {
    kind: "hourly-day" as const,
    hours: 24,
    date: "2024-11-13",
    timezone: "Europe/Madrid",
    comparableToModelDay: true,
  },
  episode: {
    kind: "episode-sum" as const,
    days: 5,
    from: "2024-11-11 00:00",
    to: "2024-11-15 23:59",
    timezone: "Europe/Madrid",
    comparableToModelDay: false,
    mm: 84.5,
  },
  dayMm: 77.3,
  peakHourMm: 19.2,
} as const;

/**
 * First public stage series in the suite. Hidrosur 038R03 nivel column.
 * Unlike MAGRE_POYO_STAGE (snapshot, no public CHJ series).
 * Window peak is 14 Nov, the morning after the rain day — not rain, not caudal.
 */
export const CARTAMA_SAIH_STAGE = {
  id: "cartama-stage",
  quantity: "stage" as const,
  unit: "m",
  source: "hidrosur",
  name: "Río Guadalhorce (Cártama)",
  code: "038R03",
  coord: SAIH_CARTAMA,
  publicSeries: true,
  peakM: 3.08,
  peakAtLocal: "2024-11-14 10:00",
  day13MaxM: 1.84,
  day13MaxAtLocal: "2024-11-13 18:00",
  note: "Public Hidrosur nivel series. Peak the morning after the rain day. Do not file as rain or as CARTAMA_SAIH_FLOW.",
} as const;

/**
 * Caudal column on the same 038R03 CSV as CARTAMA_SAIH_STAGE. Not stage.
 */
export const CARTAMA_SAIH_FLOW = {
  id: "cartama-flow",
  quantity: "flow" as const,
  unit: "m³/s",
  source: "hidrosur",
  name: "Río Guadalhorce (Cártama)",
  code: "038R03",
  coord: SAIH_CARTAMA,
  publicSeries: true,
  peakM3s: 455.59,
  peakAtLocal: CARTAMA_SAIH_STAGE.peakAtLocal,
  day13MaxM3s: 210.2,
  day13MaxAtLocal: CARTAMA_SAIH_STAGE.day13MaxAtLocal,
  sameCsvAs: CARTAMA_SAIH_STAGE.id,
  note: "Caudal from the 038R03 CSV, not the nivel column. Do not file as CARTAMA_SAIH_STAGE.",
} as const;

export function formatCartamaObserved(): string {
  return [
    `Hidrosur Cártama ${CARTAMA_SAIH_RAIN.code} rain: ${CARTAMA_SAIH_RAIN.dayMm} mm in ${CARTAMA_SAIH_RAIN.window.hours} h on ${CARTAMA_SAIH_RAIN.window.date} (Europe/Madrid). Peak hour ${CARTAMA_SAIH_RAIN.peakHourMm} mm. This 24 h sum is comparable to a model calendar day. Not CHG. Not AEMET.`,
    `${CARTAMA_SAIH_RAIN.episode.days}-day episode-sum ${CARTAMA_SAIH_RAIN.episode.from}–${CARTAMA_SAIH_RAIN.episode.to} is ${CARTAMA_SAIH_RAIN.episode.mm} mm — almost all the 13th, not a Magre-style 8-day mix. Do not use the episode-sum as the model-day referee.`,
    `Stage ${CARTAMA_SAIH_STAGE.code} (nivel, public series — Poyo has none): 13 Nov max ${CARTAMA_SAIH_STAGE.day13MaxM} m at ${CARTAMA_SAIH_STAGE.day13MaxAtLocal}; window peak ${CARTAMA_SAIH_STAGE.peakM} m at ${CARTAMA_SAIH_STAGE.peakAtLocal}. Not rain, not caudal.`,
    `Flow from the same ${CARTAMA_SAIH_FLOW.code} CSV (caudal column, not ${CARTAMA_SAIH_STAGE.id}): 13 Nov max ${CARTAMA_SAIH_FLOW.day13MaxM3s} m³/s; window peak ${CARTAMA_SAIH_FLOW.peakM3s} m³/s at the same ${CARTAMA_SAIH_FLOW.peakAtLocal} hour.`,
  ].join("\n");
}

export function formatMagreObserved(): string {
  const rain = MAGRE_SAIH_RAIN.map(
    (s) => `  ${s.name.padEnd(28)} ${s.mm.toFixed(1).padStart(6)} mm  ${s.code}`,
  );
  return [
    `AEMET Turís ~${MAGRE_CORE_OBSERVED.dayMm.from}–${MAGRE_CORE_OBSERVED.dayMm.to} mm in ${MAGRE_CORE_OBSERVED.window.hours} h on ${MAGRE_CORE_OBSERVED.window.date}, peak hour ~${MAGRE_CORE_OBSERVED.peakHourMm} mm. Not SAIH. Not a 24 h model day.`,
    `CHJ SAIH ${MAGRE_SAIH_EPISODE.window.days}-day episode-sum ${MAGRE_SAIH_EPISODE.window.from}–${MAGRE_SAIH_EPISODE.window.to} (${MAGRE_SAIH_EPISODE.report}). Not 29 Oct calendar-day totals. Do not compare to a single model-run day.`,
    ...rain,
    `Poyo N-III stage (nivel, not rain, not caudal): last ${MAGRE_POYO_STAGE.lastLevelM} m at ${MAGRE_POYO_STAGE.lostAtLocal}, sensor lost before the peak. No public CHJ nivel series.`,
    `Poyo N-III flow at loss (caudal snapshot from the episode report, not live variable ${POYO_N3_CAUDAL.variableId}): last ${MAGRE_POYO_FLOW_AT_LOSS.lastFlowM3s} m³/s at the same instant.`,
  ].join("\n");
}
