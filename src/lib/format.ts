import { localeFor } from "@/types/lang";
import type { Lang } from "@/types/lang";

export function fmt(n: number | null, digits = 0, unit = ""): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}${unit}`;
}

/** Calendar date in peninsular Spain (YYYY-MM-DD). */
export function madridYmd(at = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Strip selection: keep a clicked day, otherwise today in Spain. */
export function pickStripDate(days: ReadonlyArray<{ date: string }>, selected: string | null): string | null {
  if (days.length === 0) return null;
  if (selected && days.some((d) => d.date === selected)) return selected;
  const today = madridYmd();
  const match = days.find((d) => d.date === today);
  return match?.date ?? days[0]?.date ?? null;
}

export function weekday(date: string, lang: Lang): string {
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(localeFor(lang), { weekday: "short" }).format(d);
}

export function dayChip(date: string, lang: Lang): string {
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(localeFor(lang), { weekday: "short", day: "numeric", month: "short" }).format(d);
}

/** Clock hour 0–23 in peninsular Spain. */
export function madridHour(at = new Date()): number {
  const raw = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  return Number(raw.find((p) => p.type === "hour")?.value ?? "0");
}

/** Same clock time as now, on the chosen day (not the day's peak). */
export function hourAtClock<T extends { time: string }>(hours: readonly T[], at = new Date()): T | null {
  const first = hours[0];
  if (!first) return null;
  const want = madridHour(at);
  let best = first;
  let bestDist = 99;
  for (const h of hours) {
    const hh = Number(h.time.slice(11, 13));
    if (!Number.isFinite(hh)) continue;
    const dist = Math.abs(hh - want);
    if (dist < bestDist) {
      best = h;
      bestDist = dist;
    }
  }
  return best;
}

export function formatDateTime(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return new Intl.DateTimeFormat(localeFor(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
