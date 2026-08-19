import type { DanaEvent } from "@/data/events";
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
  if (date !== event.peakDate) return "unlabelled";
  if (event.riuadaHotspotIds.includes(hotspotId)) return "riuada";
  if (event.quietHotspotIds.includes(hotspotId)) return "quiet";
  return "unlabelled";
}

export function verdictFor(expected: DayLabel, dayLevel: RiskLevel): DayVerdict {
  if (expected === "riuada") return dayLevel >= WATCH ? "hit" : "miss";
  if (expected === "quiet") return dayLevel >= WATCH ? "false-alarm" : "ok-quiet";
  return "unlabelled";
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

export function formatSuite(texts: readonly string[], summaries: readonly BacktestSummary[]): string {
  const c = suiteCounts(summaries);
  return [
    ...texts,
    "===== labelled suite =====",
    `riuada ${c.hits}/${c.riuada} hits, ${c.misses} misses`,
    `quiet  ${c.okQuiet}/${c.quiet} ok, ${c.falseAlarms} false alarms`,
  ].join("\n\n");
}

export function summarisePeak(rows: readonly PlaceDayRow[], peakDate: string): BacktestSummary {
  const summary: BacktestSummary = { hits: [], misses: [], falseAlarms: [], okQuiet: [] };
  for (const row of rows) {
    if (row.date !== peakDate) continue;
    if (row.verdict === "hit") summary.hits.push(row.hotspotId);
    else if (row.verdict === "miss") summary.misses.push(row.hotspotId);
    else if (row.verdict === "false-alarm") summary.falseAlarms.push(row.hotspotId);
    else if (row.verdict === "ok-quiet") summary.okQuiet.push(row.hotspotId);
  }
  return summary;
}

export function formatReport(
  event: DanaEvent,
  rows: readonly PlaceDayRow[],
  summary: BacktestSummary,
  leads?: ReadonlyArray<{ hotspotId: string; analysisMm: number; lead24Mm: number; lead48Mm: number; lead72Mm: number }>,
): string {
  const lines = [
    `${event.name} (${event.id})`,
    event.notes,
    "",
    "square               date        lvl  mm    setup  impact  label       verdict",
  ];
  for (const row of rows) {
    if (row.expected === "unlabelled" && row.date !== event.peakDate) continue;
    const name = row.name.padEnd(20).slice(0, 20);
    const mm = row.precipMm.toFixed(0).padStart(5);
    const setup = row.maxSetup.toFixed(2);
    const impact = row.maxImpact.toFixed(2);
    lines.push(
      `${name} ${row.date}   ${row.dayLevel} ${mm}   ${setup}   ${impact}  ${row.expected.padEnd(11)} ${row.verdict}`,
    );
  }
  lines.push("");
  lines.push(`hits:         ${summary.hits.join(", ") || "—"}`);
  lines.push(`misses:       ${summary.misses.join(", ") || "—"}`);
  lines.push(`false alarms: ${summary.falseAlarms.join(", ") || "—"}`);
  lines.push(`ok quiet:     ${summary.okQuiet.join(", ") || "—"}`);
  if (leads && leads.length > 0) {
    lines.push("");
    lines.push("model rain on peak day (analysis / T−24 / T−48 / T−72) — millimetres only, not a full score:");
    for (const lead of leads) {
      lines.push(
        `  ${lead.hotspotId}: ${lead.analysisMm.toFixed(0)} / ${lead.lead24Mm.toFixed(0)} / ${lead.lead48Mm.toFixed(0)} / ${lead.lead72Mm.toFixed(0)} mm`,
      );
    }
  }
  return lines.join("\n");
}
