import { AROME_FRANCE } from "@/api/arome";
import { fetchLeadPrecip, type LeadPrecip } from "@/api/historical";
import { CHIVA, formatMagreObserved, PORTO_CRISTO, TURIS } from "@/data/probes";
import { hotspotById } from "@/data/hotspots";
import type { Coord } from "@/types/weather";

const LEAD_MODELS = [
  { id: "arome_france", models: AROME_FRANCE },
  { id: "icon_eu", models: "icon_eu" },
  { id: "ecmwf_ifs025", models: "ecmwf_ifs025" },
  { id: "desk-mix", models: undefined },
] as const;

export type NamedLead = { place: string; model: string } & LeadPrecip;

function fmt(n: number | null): string {
  return n == null ? "—" : n.toFixed(0);
}

async function leadsAt(place: string, point: Coord, date: string): Promise<NamedLead[]> {
  const out: NamedLead[] = [];
  for (const m of LEAD_MODELS) {
    const precip = await fetchLeadPrecip(point, date, m.models);
    out.push({ place, model: m.id, ...precip });
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

export async function fetchMagreLeadContrast(date: string): Promise<NamedLead[]> {
  const utiel = hotspotById("utiel-requena");
  const horta = hotspotById("valencia-horta");
  if (!utiel || !horta) throw new Error("missing Magre hotspots");
  const rows: NamedLead[] = [];
  rows.push(...(await leadsAt("Turís", TURIS, date)));
  rows.push(...(await leadsAt("Chiva", CHIVA, date)));
  rows.push(...(await leadsAt("Utiel square", utiel.center, date)));
  rows.push(...(await leadsAt("l'Horta square", horta.center, date)));
  return rows;
}

export function formatMagreLeadContrast(rows: readonly NamedLead[]): string {
  const lines = [
    "Turís / Chiva vs desk squares — previous-run millimetres on 29 Oct 2024 (analysis / T−24 / T−48 / T−72).",
    formatMagreObserved(),
    "AROME's best cell (Chiva T−24 240 mm) is less wrong than ICON/ECMWF on those two cells, still ~3× short of AEMET Turís. Grid-undercatch remains. AROME T−48/T−72 is empty (2-day horizon), not zero.",
  ];
  for (const r of rows) {
    lines.push(
      `  ${r.place.padEnd(16)} ${r.model.padEnd(14)} ${fmt(r.analysisMm)} / ${fmt(r.lead24Mm)} / ${fmt(r.lead48Mm)} / ${fmt(r.lead72Mm)} mm`,
    );
  }
  return lines.join("\n");
}

export async function fetchMallorcaLeadContrast(date: string): Promise<NamedLead[]> {
  const island = hotspotById("mallorca");
  if (!island) throw new Error("missing Mallorca hotspot");
  const rows: NamedLead[] = [];
  rows.push(...(await leadsAt("island centre", island.center, date)));
  rows.push(...(await leadsAt("Porto Cristo", PORTO_CRISTO, date)));
  return rows;
}

export function formatMallorcaLeadContrast(rows: readonly NamedLead[]): string {
  const lines = [
    "Mallorca 28 Oct — previous-run millimetres (analysis / T−24 / T−48 / T−72).",
    "Observed Llevant ~120–174 mm (Manacor; up to ~180 mm Sa Vall). Desk scores the island centre; Porto Cristo is east. Island square, not inland-orographic — does not increment INLAND_AROME_RULE_MIN_CELLS.",
  ];
  for (const r of rows) {
    lines.push(
      `  ${r.place.padEnd(16)} ${r.model.padEnd(14)} ${fmt(r.analysisMm)} / ${fmt(r.lead24Mm)} / ${fmt(r.lead48Mm)} / ${fmt(r.lead72Mm)} mm`,
    );
  }
  return lines.join("\n");
}
