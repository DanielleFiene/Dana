import { copy } from "@/i18n/copy";
import { THRESHOLDS } from "@/scoring/thresholds";
import type { Lang } from "@/types/lang";
import type { RiskLevel } from "@/types/risk";
import type { HourScore } from "@/types/weather";

export const DRY_WINDOW_MM = 8;

export function isDryWindow(hour: HourScore | null): boolean {
  if (!hour) return true;
  const day = hour.precip24hMm ?? 0;
  const hourMm = hour.precipHourMm ?? 0;
  return day < DRY_WINDOW_MM && hourMm < 2 && !hour.floodGate;
}

export function levelLabel(level: RiskLevel, lang: Lang): string {
  return copy[lang].levels[level].name;
}

export function heroStatus(
  hour: HourScore | null,
  lang: Lang,
): { colorLevel: RiskLevel; title: string; hint: string } {
  const t = copy[lang];
  if (!hour || isDryWindow(hour)) {
    const pool = (hour?.setup ?? 0) >= THRESHOLDS.classicDanaSetup;
    return {
      colorLevel: 0,
      title: t.levels[0].name,
      hint: pool ? t.patternNotRain : "",
    };
  }
  return {
    colorLevel: hour.level,
    title: levelLabel(hour.level, lang),
    hint: t.levels[hour.level].hint,
  };
}

/** Hour-bar colour: no orange/red for a dry sky. Red/purple only if rain is on. */
export function paintLevel(hour: HourScore): RiskLevel {
  if (hour.level >= 3) return hour.level;
  if (isDryWindow(hour)) return hour.level >= 1 ? 1 : 0;
  return hour.level;
}
