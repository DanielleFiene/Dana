import { RISK_META } from "@/types/risk";
import type { RiskLevel } from "@/types/risk";

type DayLevel = { date: string; level: number };

/** Map fill follows the strip day. No date yet → first day (today). Missing date → today, never a fake green. */
export function corridorFill(days: ReadonlyArray<DayLevel> | undefined, selectedDate: string | null): {
  ready: boolean;
  level: RiskLevel;
  color: string;
} {
  if (!days?.length) return { ready: false, level: 0, color: RISK_META[0].color };
  const first = days[0];
  if (!first) return { ready: false, level: 0, color: RISK_META[0].color };
  const day = selectedDate ? days.find((d) => d.date === selectedDate) : first;
  const level = (day?.level ?? first.level) as RiskLevel;
  return { ready: true, level, color: RISK_META[level].color };
}
