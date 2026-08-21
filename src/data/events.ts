/**
 * Hand labels for backtests. These are not official AEMET zones and not
 * complete catchments — they are the 14 desk squares, tagged after the fact.
 *
 * `riuada` = a flash flood / rambla disaster on that square that day.
 * `quiet` = no flood on that square that day (false-alarm control).
 * Unlisted squares are ignored in hit/miss counts.
 */
export type DanaEvent = {
  id: string;
  name: string;
  /** Inclusive calendar dates in Europe/Madrid. */
  startDate: string;
  endDate: string;
  peakDate: string;
  /** If set, every date gets the same riuada/quiet labels. Otherwise only `peakDate`. */
  peakDates?: readonly string[];
  riuadaHotspotIds: readonly string[];
  quietHotspotIds: readonly string[];
  notes: string;
};

export function labelledDates(event: DanaEvent): readonly string[] {
  return event.peakDates && event.peakDates.length > 0 ? event.peakDates : [event.peakDate];
}

const MAGRE_SQUARES = ["valencia-horta", "utiel-requena", "ribera-jucar"] as const;

/** 29 Oct 2024: documented rambla / urban floods on our squares that calendar day. */
const MAGRE_RIUADA = [...MAGRE_SQUARES, "malaga", "murcia"] as const;

/**
 * Same calendar day, no flood on the square. Mallorca's Porto Cristo floods were
 * the 28th; Catalonia's Ebre / Llobregat floods were 30 Oct–4 Nov.
 */
const MAGRE_QUIET = ["mallorca", "pitiusas", "tarragona", "barcelona"] as const;

export const DANA_EVENTS: readonly DanaEvent[] = [
  {
    id: "2024-10-mallorca",
    name: "28 Oct 2024 Porto Cristo / Manacor",
    startDate: "2024-10-27",
    endDate: "2024-10-28",
    peakDate: "2024-10-28",
    riuadaHotspotIds: ["mallorca"],
    quietHotspotIds: ["pitiusas"],
    notes:
      "Torrent de Na Llebrona / Riuet at Porto Cristo; Manacor ~120–174 mm. Island square, not inland-orographic — does not increment INLAND_AROME_RULE_MIN_CELLS. Desk scores the island centre; Porto Cristo is east. Mix 0 mm / AROME ~50 mm at the core vs observed — grid-undercatch. Pitiusas quiet control painted via 0.48+0.38 the day before Magre: unassigned, not hangover. Magre squares unlabelled (their riuada is the 29th).",
  },
  {
    id: "2024-10-magre",
    name: "29 Oct 2024 Magre / l'Horta",
    startDate: "2024-10-27",
    endDate: "2024-10-30",
    peakDate: "2024-10-29",
    riuadaHotspotIds: MAGRE_RIUADA,
    quietHotspotIds: MAGRE_QUIET,
    notes:
      "Cut-off over the Magre–Horta–Xúquer belt, plus Guadalhorce (Álora) and Murcia city ramblas that day. Castellón, Alacant, Vega Baja, Almería and Gibraltar stay unlabelled: rain or warnings, no clear rambla disaster on the 29th. Balearics/Catalonia quiet on this date (their floods were other days).",
  },
  {
    id: "2024-10-magre-aftermath",
    name: "30 Oct–2 Nov 2024 Magre squares after the riuada",
    startDate: "2024-10-30",
    endDate: "2024-11-02",
    peakDate: "2024-10-30",
    peakDates: ["2024-10-30", "2024-10-31", "2024-11-01", "2024-11-02"],
    riuadaHotspotIds: [],
    quietHotspotIds: MAGRE_SQUARES,
    notes:
      "Hangover probe: no new rambla on l'Horta / Utiel / Xúquer. Split leftover-rain (rolling 24/48 h still Magre) from thin 0.48+0.38 hangover. Do not retune either knob from this event.",
  },
  {
    id: "2024-11-catalunya",
    name: "4 Nov 2024 Llobregat / Tarragona",
    startDate: "2024-11-03",
    endDate: "2024-11-04",
    peakDate: "2024-11-04",
    riuadaHotspotIds: ["barcelona", "tarragona"],
    quietHotspotIds: MAGRE_SQUARES,
    notes:
      "Sitges flooded on the 3rd (same Barcelona square). Peak day is the 4th: El Prat / Llobregat and Salou (~180 mm) with school closures across the Ebre comarques. Magre squares are quiet that day — still cleaning up, not a new rambla. Oct 30 Terres de l'Ebre stays a different calendar day, unlabelled here. This event is a known analysis miss: the global grid only had tens of mm on the Catalan coast.",
  },
  {
    id: "2024-11-almeria",
    name: "11 Nov 2024 Almería / Poniente ramblas",
    startDate: "2024-11-10",
    endDate: "2024-11-12",
    peakDate: "2024-11-11",
    riuadaHotspotIds: ["almeria"],
    quietHotspotIds: [],
    notes:
      "Ramblas at Balanegra / Vícar / Dalías: A-7 cut, cars in the rambla de la Culebra, ~40 112 calls. South belt, outside AROME France domain — out-of-domain control, not inland-orographic, not an AROME skill score. Other corridors that day stay unlabelled.",
  },
  {
    id: "2024-11-malaga",
    name: "13 Nov 2024 Málaga / Guadalhorce",
    startDate: "2024-11-12",
    endDate: "2024-11-14",
    peakDate: "2024-11-13",
    riuadaHotspotIds: ["malaga"],
    quietHotspotIds: [],
    notes:
      "Squall line / MCS over the city and Axarquía. Guadalhorce evacuations and urban flooding. Desk mechanism: upstream-inflow (Cártama rain mild, stage peaked ~22 h later) — not grid-undercatch. Farola 022P01 city-core 24 h on 13 Nov is the same order as Cártama (not Magre-core). South belt, always out of AROME France domain: no AROME comparison row, does not increment INLAND_AROME_RULE_MIN_CELLS. Other corridors that day stay unlabelled.",
  },
  {
    id: "2023-09-murcia",
    name: "3 Sep 2023 Murcia / Guadalentín",
    startDate: "2023-09-02",
    endDate: "2023-09-04",
    peakDate: "2023-09-03",
    riuadaHotspotIds: ["murcia"],
    quietHotspotIds: [],
    notes:
      "AEMET DANA 2–4 Sep 2023. The cut-off sat SW of the peninsula; Murcia was later a catastrophic zone. Madrid/Toledo are out of this desk. Open-Meteo AROME hours for this date are all-null: archive gap, not an AROME dry-miss, and not the inland/coast hypothesis (that uses Magre 29 Oct 2024 where AROME did return millimetres).",
  },
  {
    id: "2024-08-quiet",
    name: "13 Aug 2024 quiet control (same Magre squares)",
    startDate: "2024-08-12",
    endDate: "2024-08-14",
    peakDate: "2024-08-13",
    riuadaHotspotIds: [],
    quietHotspotIds: MAGRE_SQUARES,
    notes: "Dry summer day on the same three squares. A flood colour here is a false alarm.",
  },
  {
    id: "2024-01-dry-pool",
    name: "15 Jan 2024 dry cold-pool control (Magre squares)",
    startDate: "2024-01-14",
    endDate: "2024-01-16",
    peakDate: "2024-01-15",
    riuadaHotspotIds: [],
    quietHotspotIds: MAGRE_SQUARES,
    notes: "Cold 500 hPa without a riada. Orange setup is allowed; red/purple is a false alarm.",
  },
];

export function danaEventById(id: string): DanaEvent | undefined {
  return DANA_EVENTS.find((e) => e.id === id);
}
