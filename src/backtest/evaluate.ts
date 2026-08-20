import { anatomyFor, type DeskMechanism, type RainSource } from "@/data/mechanisms";
import { labelledDates, type DanaEvent } from "@/data/events";
import { formatHingeMargin, type HingeMargin } from "@/backtest/margin";
import type { RiskLevel } from "@/types/risk";

export type DayLabel = "riuada" | "quiet" | "unlabelled";
export type DayVerdict = "hit" | "miss" | "false-alarm" | "ok-quiet" | "unlabelled";

export type PlaceDayRow = {
  hotspotId: string;
  name: string;
  date: string;
  dayLevel: RiskLevel;
  peakHourLevel: RiskLevel;
  precipMm: number;
  maxSetup: number;
  maxImpact: number;
  expected: DayLabel;
  verdict: DayVerdict;
  deskMechanism: DeskMechanism | "unassigned" | null;
  margin: HingeMargin | null;
};

export type BacktestSummary = {
  hits: string[];
  misses: string[];
  falseAlarms: string[];
  okQuiet: string[];
};

const WATCH = 3;

export function shiftIsoDate(iso: string, days: number): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Bad ISO date ${iso}`);
  }
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function expectedLabel(event: DanaEvent, hotspotId: string, date: string): DayLabel {
  if (!labelledDates(event).includes(date)) return "unlabelled";
  if (event.riuadaHotspotIds.includes(hotspotId)) return "riuada";
  if (event.quietHotspotIds.includes(hotspotId)) return "quiet";
  return "unlabelled";
}

export function verdictFor(expected: DayLabel, dayLevel: RiskLevel): DayVerdict {
  if (expected === "riuada") return dayLevel >= WATCH ? "hit" : "miss";
  if (expected === "quiet") return dayLevel >= WATCH ? "false-alarm" : "ok-quiet";
  return "unlabelled";
}

/**
 * Attach the hand anatomy only when the verdict matches what that row was
 * written for. A hangover tag must never ride along on a grid miss.
 */
export function deskMechanismFor(
  eventId: string,
  hotspotId: string,
  verdict: DayVerdict,
  date?: string,
  source: RainSource = "mix",
): DeskMechanism | "unassigned" | null {
  if (verdict !== "hit" && verdict !== "miss" && verdict !== "false-alarm") return null;
  const anatomy = anatomyFor(eventId, hotspotId, date, source);
  if (!anatomy) {
    if (verdict === "miss" || verdict === "false-alarm") return "unassigned";
    return null;
  }
  if (verdict === "miss" && anatomy.when === "miss") return anatomy.desk;
  if (verdict === "false-alarm" && anatomy.when === "false-alarm") return anatomy.desk;
  if (verdict === "hit" && anatomy.when === "hit-despite-undercatch") return anatomy.desk;
  if (verdict === "hit" && anatomy.when === "lead-time-dry") return anatomy.desk;
  if (verdict === "miss" || verdict === "false-alarm") return "unassigned";
  return null;
}

export type DeskTally = {
  gridUndercatchMisses: string[];
  hangoverFalseAlarms: string[];
  leftoverRainFalseAlarms: string[];
  hitDespiteUndercatch: string[];
  leadTimeDry: string[];
  unassignedMisses: string[];
  unassignedFalseAlarms: string[];
};

function emptyDeskTally(): DeskTally {
  return {
    gridUndercatchMisses: [],
    hangoverFalseAlarms: [],
    leftoverRainFalseAlarms: [],
    hitDespiteUndercatch: [],
    leadTimeDry: [],
    unassignedMisses: [],
    unassignedFalseAlarms: [],
  };
}

function parseRowTag(tag: string): { hotspotId: string; date?: string } {
  const at = tag.indexOf("@");
  if (at < 0) return { hotspotId: tag };
  return { hotspotId: tag.slice(0, at), date: tag.slice(at + 1) };
}

export function tallyDeskMechanisms(
  eventId: string,
  summary: BacktestSummary,
  source: RainSource = "mix",
): DeskTally {
  const out = emptyDeskTally();
  for (const id of summary.misses) {
    const { hotspotId, date } = parseRowTag(id);
    const m = deskMechanismFor(eventId, hotspotId, "miss", date, source);
    const key = `${eventId}/${id}`;
    if (m === "grid-undercatch") out.gridUndercatchMisses.push(key);
    else out.unassignedMisses.push(key);
  }
  for (const id of summary.falseAlarms) {
    const { hotspotId, date } = parseRowTag(id);
    const m = deskMechanismFor(eventId, hotspotId, "false-alarm", date, source);
    const key = `${eventId}/${id}`;
    if (m === "hangover") out.hangoverFalseAlarms.push(key);
    else if (m === "leftover-rain") out.leftoverRainFalseAlarms.push(key);
    else out.unassignedFalseAlarms.push(key);
  }
  for (const id of summary.hits) {
    const { hotspotId, date } = parseRowTag(id);
    const anatomy = anatomyFor(eventId, hotspotId, date, source);
    if (!anatomy) continue;
    const key = `${eventId}/${id}`;
    if (anatomy.when === "hit-despite-undercatch") out.hitDespiteUndercatch.push(key);
    if (anatomy.when === "lead-time-dry") out.leadTimeDry.push(key);
  }
  return out;
}

export function mergeDeskTallies(parts: readonly DeskTally[]): DeskTally {
  const out = emptyDeskTally();
  for (const p of parts) {
    out.gridUndercatchMisses.push(...p.gridUndercatchMisses);
    out.hangoverFalseAlarms.push(...p.hangoverFalseAlarms);
    out.leftoverRainFalseAlarms.push(...p.leftoverRainFalseAlarms);
    out.hitDespiteUndercatch.push(...p.hitDespiteUndercatch);
    out.leadTimeDry.push(...p.leadTimeDry);
    out.unassignedMisses.push(...p.unassignedMisses);
    out.unassignedFalseAlarms.push(...p.unassignedFalseAlarms);
  }
  return out;
}

function formatDeskTally(tally: DeskTally): string[] {
  return [
    "desk mechanisms (do not mix knobs):",
    `  grid-undercatch misses:     ${tally.gridUndercatchMisses.join(", ") || "—"}`,
    `  hangover false alarms:      ${tally.hangoverFalseAlarms.join(", ") || "—"}`,
    `  leftover-rain false alarms: ${tally.leftoverRainFalseAlarms.join(", ") || "—"}`,
    `  hits despite undercatch:    ${tally.hitDespiteUndercatch.join(", ") || "—"}`,
    `  lead-time dry (still a hit): ${tally.leadTimeDry.join(", ") || "—"}`,
    `  unassigned misses:          ${tally.unassignedMisses.join(", ") || "—"}`,
    `  unassigned false alarms:    ${tally.unassignedFalseAlarms.join(", ") || "—"}`,
  ];
}

export type SuiteCounts = {
  riuada: number;
  hits: number;
  misses: number;
  quiet: number;
  okQuiet: number;
  falseAlarms: number;
};

export function suiteCounts(summaries: readonly BacktestSummary[]): SuiteCounts {
  return {
    hits: summaries.reduce((n, s) => n + s.hits.length, 0),
    misses: summaries.reduce((n, s) => n + s.misses.length, 0),
    falseAlarms: summaries.reduce((n, s) => n + s.falseAlarms.length, 0),
    okQuiet: summaries.reduce((n, s) => n + s.okQuiet.length, 0),
    riuada: summaries.reduce((n, s) => n + s.hits.length + s.misses.length, 0),
    quiet: summaries.reduce((n, s) => n + s.okQuiet.length + s.falseAlarms.length, 0),
  };
}

export function thinMarginTags(eventId: string, rows: readonly PlaceDayRow[]): string[] {
  return rows
    .filter((r) => r.expected !== "unlabelled" && r.margin?.thin)
    .map((r) => `${eventId}/${r.hotspotId}@${r.date}`);
}

export function formatSuite(
  texts: readonly string[],
  summaries: readonly BacktestSummary[],
  eventIds: readonly string[],
  thinTags: readonly string[] = [],
): string {
  const c = suiteCounts(summaries);
  const tally = mergeDeskTallies(summaries.map((s, i) => tallyDeskMechanisms(eventIds[i] ?? "", s)));
  return [
    ...texts,
    "===== labelled suite =====",
    `riuada ${c.hits}/${c.riuada} hits, ${c.misses} misses`,
    `quiet  ${c.okQuiet}/${c.quiet} ok, ${c.falseAlarms} false alarms`,
    `thin margins ${thinTags.length}: ${thinTags.join(", ") || "—"}`,
    formatDeskTally(tally).join("\n"),
    "catchment (burn scars, infiltration) is not a desk knob — see CATCHMENT_HYPOTHESES.",
  ].join("\n\n");
}

export function summarisePeak(rows: readonly PlaceDayRow[], peakDate: string): BacktestSummary {
  return summariseLabelled(rows, [peakDate]);
}

export function summariseLabelled(rows: readonly PlaceDayRow[], dates: readonly string[]): BacktestSummary {
  const want = new Set(dates);
  const dated = dates.length > 1;
  const summary: BacktestSummary = { hits: [], misses: [], falseAlarms: [], okQuiet: [] };
  for (const row of rows) {
    if (!want.has(row.date)) continue;
    const tag = dated ? `${row.hotspotId}@${row.date}` : row.hotspotId;
    if (row.verdict === "hit") summary.hits.push(tag);
    else if (row.verdict === "miss") summary.misses.push(tag);
    else if (row.verdict === "false-alarm") summary.falseAlarms.push(tag);
    else if (row.verdict === "ok-quiet") summary.okQuiet.push(tag);
  }
  return summary;
}

function fmtMm(n: number | null | undefined): string {
  return n == null ? "—" : n.toFixed(0);
}

export function formatReport(
  event: DanaEvent,
  rows: readonly PlaceDayRow[],
  summary: BacktestSummary,
  leads?: ReadonlyArray<{
    hotspotId: string;
    analysisMm: number | null;
    lead24Mm: number | null;
    lead48Mm: number | null;
    lead72Mm: number | null;
  }>,
  source: RainSource = "mix",
): string {
  const dates = labelledDates(event);
  const multi = dates.length > 1;
  const lines = [
    `${event.name} (${event.id})`,
    event.notes,
    "",
    "square               date        lvl  mm    setup  impact  label       verdict",
  ];
  for (const row of rows) {
    if (row.expected === "unlabelled" && (multi || row.date !== event.peakDate)) continue;
    const name = row.name.padEnd(20).slice(0, 20);
    const mm = row.precipMm.toFixed(0).padStart(5);
    const setup = row.maxSetup.toFixed(2);
    const impact = row.maxImpact.toFixed(2);
    lines.push(
      `${name} ${row.date}   ${row.dayLevel} ${mm}   ${setup}   ${impact}  ${row.expected.padEnd(11)} ${row.verdict}`,
    );
    if (row.expected !== "unlabelled" && row.margin) {
      lines.push(`                     ${formatHingeMargin(row.margin)}`);
    }
  }
  const thin = rows.filter((r) => r.expected !== "unlabelled" && r.margin?.thin);
  lines.push("");
  lines.push(`hits:         ${summary.hits.join(", ") || "—"}`);
  lines.push(`misses:       ${summary.misses.join(", ") || "—"}`);
  lines.push(`false alarms: ${summary.falseAlarms.join(", ") || "—"}`);
  lines.push(`ok quiet:     ${summary.okQuiet.join(", ") || "—"}`);
  lines.push(`thin margins: ${thin.length ? thin.map((r) => `${r.hotspotId}@${r.date}`).join(", ") : "—"}`);
  lines.push("");
  lines.push(...formatDeskTally(tallyDeskMechanisms(event.id, summary, source)));
  const tagged = rows.filter((r) => dates.includes(r.date) && r.deskMechanism);
  for (const row of tagged) {
    const anatomy = anatomyFor(event.id, row.hotspotId, row.date, source);
    if (!anatomy) continue;
    if (row.verdict === "ok-quiet" || row.verdict === "unlabelled") continue;
    if (row.verdict === "hit" && anatomy.when !== "hit-despite-undercatch" && anatomy.when !== "lead-time-dry") {
      continue;
    }
    lines.push(`  ${row.hotspotId} [${anatomy.desk}]: ${anatomy.note}`);
  }
  if (leads && leads.length > 0) {
    lines.push("");
    lines.push("model rain on peak day (analysis / T−24 / T−48 / T−72) — millimetres only, not a full score:");
    for (const lead of leads) {
      lines.push(
        `  ${lead.hotspotId}: ${fmtMm(lead.analysisMm)} / ${fmtMm(lead.lead24Mm)} / ${fmtMm(lead.lead48Mm)} / ${fmtMm(lead.lead72Mm)} mm`,
      );
    }
  }
  return lines.join("\n");
}
