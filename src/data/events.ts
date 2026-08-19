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
  riuadaHotspotIds: readonly string[];
  quietHotspotIds: readonly string[];
  notes: string;
};

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
    id: "2024-11-malaga",
    name: "13 Nov 2024 Málaga / Guadalhorce",
    startDate: "2024-11-12",
    endDate: "2024-11-14",
    peakDate: "2024-11-13",
    riuadaHotspotIds: ["malaga"],
    quietHotspotIds: [],
    notes:
      "Squall line / MCS over the city and Axarquía. Guadalhorce evacuations and urban flooding. Other corridors that day stay unlabelled.",
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
      "AEMET DANA 2–4 Sep 2023. The cut-off sat SW of the peninsula; Murcia was later a catastrophic zone. Madrid/Toledo are out of this desk.",
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
