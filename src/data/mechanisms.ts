/**
 * Why a labelled square hit, missed, or false-alarmed.
 *
 * Desk mechanisms are the only ones that may later move a score knob —
 * and never the same knob. Catchment hypotheses (soil, burn scars) explain
 * runoff on the ground. They are not a third slider on setup/impact.
 */
export const DESK_MECHANISMS = {
  "grid-undercatch":
    "Model millimetres far below the convective core. 2.5 km AROME can be less wrong than ICON on one cell and still 3× short of 700 mm. Upscale can still hit; lowering rain thresholds to chase a miss will spawn false alarms elsewhere.",
  hangover:
    "Leftover cut-off setup plus soil/impact after a big event, with little new rain. The 0.48+0.38 path and day colour following any hour at 3. Do not mix with the 22 mm corridor upscale.",
  "leftover-rain":
    "Calendar day already quiet, but rolling 24/48 h still holds the previous dump (or leftover impact from those millimetres). Corridor upscale / wet impact, not the thin 0.48+0.38 hangover hinge. An AROME-only leftover is this same knob: AROME put more Magre millimetres into the window, not a new 'AROME false alarm' bucket.",
  "lead-time-dry":
    "Analysis (stitched first hours) had rain; previous-run T−24/48/72 did not. Forecast skill, not the live formula.",
  "upstream-inflow":
    "Local millimetres were not the core; stage/flow still rose because the catchment brought water in from upstream. Cártama 13 Nov 2024: 77 mm rain, river peak the next morning. Not grid-undercatch — a better rain model is the wrong fix; the missing input is upstream stage/flow. Do not move rain thresholds. One ~22 h lag is a recorded routing delay, not a rule until another basin repeats it.",
} as const;

export type DeskMechanism = keyof typeof DESK_MECHANISMS;

export type AnatomyWhen =
  | "miss"
  | "false-alarm"
  | "hit-despite-undercatch"
  | "lead-time-dry"
  | "upstream-inflow";

export type RainSource = "mix" | "arome";

export type SquareAnatomy = {
  eventId: string;
  hotspotId: string;
  /** If set, only that labelled calendar day. Aftermath needs this split. */
  date?: string;
  /** Default mix. AROME-only outcomes must not inherit the mix tag. */
  source?: RainSource;
  when: AnatomyWhen;
  desk: DeskMechanism;
  note: string;
};

/**
 * Hand anatomy for known outcomes. A miss without a row here is `unassigned`
 * and must not be dumped into hangover or undercatch by default.
 */
export const SQUARE_ANATOMY: readonly SquareAnatomy[] = [
  {
    eventId: "2024-10-magre",
    hotspotId: "utiel-requena",
    when: "hit-despite-undercatch",
    desk: "grid-undercatch",
    note: "Mix ~42 mm vs AEMET Turís ~700–770 mm (14 h on the 29th) and SAIH Chiva 621 mm (8-day episode-sum, not a 24 h total). AROME ~203 mm on this square is less wrong, still ~3× short of Turís. Corridor upscale still reached 3. A hit, not a miss — do not retune, and do not sell AROME as the fix.",
  },
  {
    eventId: "2024-11-catalunya",
    hotspotId: "barcelona",
    when: "miss",
    desk: "grid-undercatch",
    note: "El Prat / Sitges floods; grid ~11 mm, day level 1. Same disease as Utiel, without enough model rain for the 22 mm upscale.",
  },
  {
    eventId: "2024-11-catalunya",
    hotspotId: "tarragona",
    when: "miss",
    desk: "grid-undercatch",
    note: "Salou ~180 mm vs grid ~17 mm, setup 0.54. Data ceiling, not severeSetupRain.",
  },
  {
    eventId: "2024-11-catalunya",
    hotspotId: "valencia-horta",
    when: "false-alarm",
    desk: "hangover",
    note: "6 days after Magre: ~8 mm, setup 0.50, impact 0.54 → day 3 via setup≥0.48 and impact≥0.38. Not grid undercatch.",
  },
  {
    eventId: "2024-11-catalunya",
    hotspotId: "ribera-jucar",
    when: "false-alarm",
    desk: "leftover-rain",
    note: "Calendar ~6 mm, but peak-hour rolling 24 h ~25 mm → upscale, not 0.48+0.38. Magre still in the window.",
  },
  {
    eventId: "2024-10-magre-aftermath",
    hotspotId: "valencia-horta",
    date: "2024-10-30",
    when: "false-alarm",
    desk: "leftover-rain",
    note: "38 mm still on the calendar day after Magre. Restregen, not a thin 0.38 hinge.",
  },
  {
    eventId: "2024-10-magre-aftermath",
    hotspotId: "valencia-horta",
    date: "2024-10-31",
    when: "false-alarm",
    desk: "leftover-rain",
    note: "5 mm on the day; peak hour still on 48 h ~142 mm Magre. Upscale leftover, not hangover 0.48+0.38.",
  },
  {
    eventId: "2024-10-magre-aftermath",
    hotspotId: "valencia-horta",
    date: "2024-11-01",
    when: "false-alarm",
    desk: "hangover",
    note: "5 mm, setup+impact +3 %. Thin 0.48+0.38. Same hinge as 4 Nov.",
  },
  {
    eventId: "2024-10-magre-aftermath",
    hotspotId: "utiel-requena",
    date: "2024-10-30",
    when: "false-alarm",
    desk: "hangover",
    note: "6 mm, setup+impact +6 %. Thin hangover, not 22 mm upscale.",
  },
  {
    eventId: "2024-10-magre-aftermath",
    hotspotId: "utiel-requena",
    date: "2024-10-31",
    source: "arome",
    when: "false-alarm",
    desk: "leftover-rain",
    note: "Calendar 0 mm, day 4. Binding path is upscale on rolling 48 h ~217 mm (AROME's own 29 Oct ~203 mm still in the window) with setup still 0.48. Impact 0.28 — not 0.48+0.38. AROME has no soil field. Mix the same day was ok-quiet (setup 0.38, 48 h 48 mm). Same leftover-rain knob as Magre-in-the-window, not a new AROME-FA bucket.",
  },
  {
    eventId: "2024-10-magre-aftermath",
    hotspotId: "ribera-jucar",
    date: "2024-10-30",
    when: "false-alarm",
    desk: "leftover-rain",
    note: "7 mm on the day, impact 0.90 from Magre still in rain/soil. Wet leftover, not a thin 0.38.",
  },
  {
    eventId: "2024-10-magre-aftermath",
    hotspotId: "ribera-jucar",
    date: "2024-11-01",
    when: "false-alarm",
    desk: "hangover",
    note: "7 mm, setup+impact +0 %. Thin 0.48+0.38.",
  },
  {
    eventId: "2023-09-murcia",
    hotspotId: "murcia",
    when: "lead-time-dry",
    desk: "lead-time-dry",
    note: "Analysis ~36 mm (hit). Previous-run rain T−24/48/72 all 0. Lead skill, not a Magre-style hangover.",
  },
  {
    eventId: "2024-10-mallorca",
    hotspotId: "mallorca",
    when: "miss",
    desk: "grid-undercatch",
    note: "Mix 0 mm at the island centre, 2 mm at Porto Cristo vs Manacor ~120–174 mm. AROME 36 / 51 mm is less wrong and still a miss (same). Data ceiling, not inland-orographic, not a recovered-miss.",
  },
  {
    eventId: "2024-11-almeria",
    hotspotId: "almeria",
    when: "miss",
    desk: "grid-undercatch",
    note: "Desk centre ~2 mm vs Poniente rambla flooding. Millimetres, not the hangover hinge. AROME is out of domain on this square — not an AROME skill score, not inland-orographic.",
  },
  {
    eventId: "2024-11-malaga",
    hotspotId: "malaga",
    when: "upstream-inflow",
    desk: "upstream-inflow",
    note: "Hidrosur Cártama 038P01 77.3 mm on 13 Nov (Europe/Madrid) vs mix ~44 mm at the gauge / ~51 mm at the square — 1.8× short, not Magre 3×. Farola 022P01 city-core 81.3 mm that day, peak hour 49.3 mm — same 24 h order as Cártama, not Turís-scale, does not reclassify as grid-undercatch. Rain peak at Cártama 12:00 on the 13th; 038R03 nivel peak 3.08 m at 10:00 on the 14th (~22 h). Local rain was not Turís-scale; the Guadalhorce still rose. Not grid-undercatch: the missing input is upstream stage/flow, not a lower rain threshold. ECMWF T−72 ~68 mm at the square vs 77 mm SAIH is one lead on one cell — not a rule. AROME is out of domain (south) — this square will never yield an AROME comparison row and does not increment inland-orographic.",
  },
];

/** Catchment / hydrology — not a score knob. Unverified until SAIH + burn maps. */
export const CATCHMENT_HYPOTHESES = [
  "Burn scars can raise runoff for the same millimetres (hydrophobic ash, less canopy). That would make a riuada worse on the ground. It does not explain a 17 mm grid vs 180 mm Salou, and it does not explain a 6 mm Magre hangover painted as heavy storms.",
  "Treat fire as a possible catchment multiplier later (with maps + gauges), never as a reason to move T500, soil weight, and 22 mm with the same hand.",
  "SAIH later calibrates ECMWF ENS members. It is not a reason to fold AROME into the live mix.",
  "Cártama Nov 2024 is upstream-inflow, not a burn-scar story and not a rain-slider. Farola 022P01 city-core rain that day is the same 24 h order as Cártama — not a reason to move the rain threshold. The ~22 h rain-to-stage lag is one catchment, one event.",
] as const;

export function anatomyFor(
  eventId: string,
  hotspotId: string,
  date?: string,
  source: RainSource = "mix",
): SquareAnatomy | undefined {
  const rows = SQUARE_ANATOMY.filter((a) => a.eventId === eventId && a.hotspotId === hotspotId);
  const want = source === "arome" ? rows.filter((a) => a.source === "arome") : rows.filter((a) => a.source !== "arome");
  if (date) {
    const exact = want.find((a) => a.date === date);
    if (exact) return exact;
  }
  return want.find((a) => a.date === undefined);
}

export function anatomyKey(eventId: string, hotspotId: string): string {
  return `${eventId}/${hotspotId}`;
}
