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

export type MagreSaihRainProbe = {
  id: "chiva" | "real" | "forata" | "requena" | "poyo-rain";
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
  { id: "chiva", name: "Chiva", code: "0P09", mm: 621, coord: SAIH_CHIVA, window: MAGRE_SAIH_EPISODE.window },
  { id: "real", name: "Marco en Real", code: "7O09", mm: 545.3, coord: SAIH_REAL, window: MAGRE_SAIH_EPISODE.window },
  { id: "forata", name: "Embalse de Forata", code: "7E03", mm: 320, coord: SAIH_FORATA, window: MAGRE_SAIH_EPISODE.window },
  { id: "requena", name: "EA 60 Requena", code: "5A02", mm: 273.4, coord: SAIH_REQUENA, window: MAGRE_SAIH_EPISODE.window },
  { id: "poyo-rain", name: "Marco rambla del Poyo N-III", code: "0O04", mm: 240.2, coord: SAIH_POYO_N3, window: MAGRE_SAIH_EPISODE.window },
];

/**
 * Poyo stage, not rain. Last good values before the sensor was lost in the
 * flood — the hydrograph is truncated, so there is no complete SAIH time
 * series for this gauge. Do not treat as an undercatch millimetre.
 */
export const MAGRE_POYO_STAGE = {
  name: "Rambla del Poyo N-III",
  code: "0O04",
  coord: SAIH_POYO_N3,
  lostAtLocal: "2024-10-29 18:55",
  lastLevelM: 4.899,
  lastFlowM3s: 2282.9,
  note: "Last values before the sensor was lost. Incomplete hydrograph, not a rain total.",
} as const;

export function formatMagreObserved(): string {
  const rain = MAGRE_SAIH_RAIN.map(
    (s) => `  ${s.name.padEnd(28)} ${s.mm.toFixed(1).padStart(6)} mm  ${s.code}`,
  );
  return [
    `AEMET Turís ~${MAGRE_CORE_OBSERVED.dayMm.from}–${MAGRE_CORE_OBSERVED.dayMm.to} mm in ${MAGRE_CORE_OBSERVED.window.hours} h on ${MAGRE_CORE_OBSERVED.window.date}, peak hour ~${MAGRE_CORE_OBSERVED.peakHourMm} mm. Not SAIH. Not a 24 h model day.`,
    `CHJ SAIH ${MAGRE_SAIH_EPISODE.window.days}-day episode-sum ${MAGRE_SAIH_EPISODE.window.from}–${MAGRE_SAIH_EPISODE.window.to} (${MAGRE_SAIH_EPISODE.report}). Not 29 Oct calendar-day totals. Do not compare to a single model-run day.`,
    ...rain,
    `Poyo N-III stage (not rain): last ${MAGRE_POYO_STAGE.lastLevelM} m / ${MAGRE_POYO_STAGE.lastFlowM3s} m³/s at ${MAGRE_POYO_STAGE.lostAtLocal}, sensor lost before the peak.`,
  ].join("\n");
}
