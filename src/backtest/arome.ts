import type { DayVerdict, PlaceDayRow } from "@/backtest/evaluate";
import { aromePrecipAvailable } from "@/api/arome";
import type { ForecastJson } from "@/api/schemas";
import { corridorBelt } from "@/data/hotspots";

export type AromeKind =
  | "same"
  | "new-false-alarm"
  | "cleared-false-alarm"
  | "new-miss"
  | "recovered-miss"
  | "archive-empty"
  | "out-of-domain";

export type AromeDelta = {
  eventId: string;
  hotspotId: string;
  date: string;
  mixVerdict: DayVerdict;
  aromeVerdict: DayVerdict | "archive-empty";
  mixMm: number;
  aromeMm: number | null;
  kind: AromeKind;
  aromeDesk: PlaceDayRow["deskMechanism"];
};

function kindOf(mix: DayVerdict, arome: DayVerdict): AromeKind {
  if (mix === "ok-quiet" && arome === "false-alarm") return "new-false-alarm";
  if (mix === "false-alarm" && arome === "ok-quiet") return "cleared-false-alarm";
  if (mix === "hit" && arome === "miss") return "new-miss";
  if (mix === "miss" && arome === "hit") return "recovered-miss";
  return "same";
}

export function compareAromeToMix(
  mix: { event: { id: string }; rows: PlaceDayRow[] },
  arome: { rows: PlaceDayRow[] },
  aromeForecastByHotspot: ReadonlyMap<string, ForecastJson | null>,
): AromeDelta[] {
  const aromeRows = new Map(arome.rows.map((r) => [`${r.hotspotId}@${r.date}`, r]));
  const out: AromeDelta[] = [];
  for (const row of mix.rows) {
    if (row.expected === "unlabelled") continue;
    const fc = aromeForecastByHotspot.get(row.hotspotId);
    if (fc === undefined) {
      out.push({
        eventId: mix.event.id,
        hotspotId: row.hotspotId,
        date: row.date,
        mixVerdict: row.verdict,
        aromeVerdict: "archive-empty",
        mixMm: row.precipMm,
        aromeMm: null,
        kind: "out-of-domain",
        aromeDesk: null,
      });
      continue;
    }
    if (!aromePrecipAvailable(fc)) {
      out.push({
        eventId: mix.event.id,
        hotspotId: row.hotspotId,
        date: row.date,
        mixVerdict: row.verdict,
        aromeVerdict: "archive-empty",
        mixMm: row.precipMm,
        aromeMm: null,
        kind: "archive-empty",
        aromeDesk: null,
      });
      continue;
    }
    const other = aromeRows.get(`${row.hotspotId}@${row.date}`);
    if (!other) continue;
    out.push({
      eventId: mix.event.id,
      hotspotId: row.hotspotId,
      date: row.date,
      mixVerdict: row.verdict,
      aromeVerdict: other.verdict,
      mixMm: row.precipMm,
      aromeMm: other.precipMm,
      kind: kindOf(row.verdict, other.verdict),
      aromeDesk: other.deskMechanism,
    });
  }
  return out;
}

export function formatAromeCompare(deltas: readonly AromeDelta[]): string {
  const pick = (k: AromeKind) => deltas.filter((d) => d.kind === k);
  const tag = (d: AromeDelta) => `${d.eventId}/${d.hotspotId}@${d.date}`;
  const lines = [
    "===== AROME France vs ICON/ECMWF mix (labelled squares only) =====",
    "AROME can be less wrong on one cell and worse on the next. Grid-undercatch remains at 2.5 km. Not a live source.",
    `same:                  ${pick("same").length}`,
    `new false alarms:      ${pick("new-false-alarm").map(tag).join(", ") || "—"}`,
    `cleared false alarms:  ${pick("cleared-false-alarm").map(tag).join(", ") || "—"}`,
    `new misses:            ${pick("new-miss").map(tag).join(", ") || "—"}`,
    `recovered misses:      ${pick("recovered-miss").map(tag).join(", ") || "—"}`,
    `archive empty (Open-Meteo gap, not a model miss, not inland/coast): ${pick("archive-empty").map(tag).join(", ") || "—"}`,
    `out of AROME domain:   ${pick("out-of-domain").map(tag).join(", ") || "—"}`,
  ];
  for (const d of pick("new-false-alarm")) {
    lines.push(`  ${tag(d)} [${d.aromeDesk ?? "unassigned"}] — not an AROME-FA bucket; use hangover vs leftover-rain.`);
  }
  lines.push("");
  lines.push("square@date                    mix mm  arome mm  mix            arome          delta");
  for (const d of deltas) {
    const id = `${d.hotspotId}@${d.date}`.padEnd(28);
    const mixMm = d.mixMm.toFixed(0).padStart(6);
    const aromeMm = d.aromeMm == null ? "     —" : d.aromeMm.toFixed(0).padStart(6);
    lines.push(
      `${id} ${mixMm}  ${aromeMm}  ${d.mixVerdict.padEnd(14)} ${String(d.aromeVerdict).padEnd(14)} ${d.kind}`,
    );
  }
  return lines.join("\n");
}

export function formatMagreSpatial(mixRows: readonly PlaceDayRow[], aromeRows: readonly PlaceDayRow[]): string {
  const peak = "2024-10-29";
  const aromeMm = new Map(aromeRows.filter((r) => r.date === peak).map((r) => [r.hotspotId, r.precipMm]));
  const lines = [
    "Magre 29 Oct model mm vs AEMET Turís (14 h) / SAIH 8-day episode-sums (table above — not a model-day match). Even AROME's best cell is still ~3× short of Turís. corridorBelt is a label only. Inland vs coast needs a majority across several independent inland-orographic cells before it is a rule. Murcia Sep 2023 AROME all-null is a different question (archive), not this table.",
    "square             belt                 mix   arome",
  ];
  for (const row of mixRows.filter((r) => r.date === peak)) {
    const a = aromeMm.get(row.hotspotId);
    const arome = a == null ? "    —" : a.toFixed(0).padStart(6);
    lines.push(
      `${row.hotspotId.padEnd(18)} ${corridorBelt(row.hotspotId).padEnd(18)} ${row.precipMm.toFixed(0).padStart(5)} ${arome}`,
    );
  }
  return lines.join("\n");
}
