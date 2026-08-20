import { weightedMean } from "@/lib/math";
import {
  capeScore,
  cinScore,
  coldCoreScore,
  blendedOnshoreScore,
  geopotentialScore,
  instabilityBundle,
  liftedIndexScore,
  moisture850Score,
  moistureScore,
  persistenceScore,
  pwatScore,
  rainBundle,
  setupBundle,
  soilWetnessScore,
  sstScore,
  thermalGradientC,
  thermalGradientScore,
} from "@/scoring/factors";
import { danaRainWatch, floodGateOpen, THRESHOLDS, type DanaRainWatch } from "@/scoring/thresholds";
import type { DayScore, HourSample, HourScore, ScoreContext } from "@/types/weather";
import type { RiskLevel } from "@/types/risk";

export type { DayScore };

export function rollingSum(values: ReadonlyArray<number | null>, endIndex: number, hours: number): number | null {
  let seen = 0;
  let sum = 0;
  const start = Math.max(0, endIndex - hours + 1);
  for (let i = start; i <= endIndex; i += 1) {
    const v = values[i];
    if (v === null || v === undefined) continue;
    seen += 1;
    sum += v;
  }
  return seen === 0 ? null : sum;
}

export function wetHourCount(
  values: ReadonlyArray<number | null>,
  endIndex: number,
  hours: number,
  minMm: number,
): number {
  let n = 0;
  const start = Math.max(0, endIndex - hours + 1);
  for (let i = start; i <= endIndex; i += 1) {
    const v = values[i];
    if (v !== null && v !== undefined && v >= minMm) n += 1;
  }
  return n;
}

/**
 * Classic DANA can fire from the pattern 3–7 days out.
 * Catastrophic requires the extra flood-gate (dangerous rain), not CAPE alone.
 * On a rambla, models under-do Med convection: DANA + tens of mm is already a major watch.
 */
export function classifyLevel(
  setup: number,
  impact: number,
  instability: number,
  watch: DanaRainWatch | 0 = 0,
): RiskLevel {
  const gate = floodGateOpen(impact);
  const upscale = watch === 0 ? 0 : danaRainWatch(setup, watch);
  if ((gate && (setup >= THRESHOLDS.floodGateMinSetup || impact >= THRESHOLDS.floodGateSoloImpact)) || upscale === 4) {
    return 4;
  }
  if (
    impact >= THRESHOLDS.severeImpact ||
    (setup >= THRESHOLDS.severeSetup && impact >= THRESHOLDS.severeSetupRain) ||
    upscale === 3
  ) {
    return 3;
  }
  if (setup >= THRESHOLDS.classicDanaSetup) return 2;
  if (
    impact >= THRESHOLDS.unsettledImpact ||
    instability >= THRESHOLDS.unsettledInstability ||
    setup >= THRESHOLDS.unsettledSetup
  ) {
    return 1;
  }
  return 0;
}

export function scoreHour(sample: HourSample, ctx: ScoreContext): HourScore {
  const rain = rainBundle(sample, ctx);
  const setup = setupBundle(sample, ctx);
  const instability = instabilityBundle(sample);
  const persist = ctx.persistWetHours === null ? null : persistenceScore(ctx.persistWetHours);
  const wetSoil = sample.soilMoisture === null ? null : soilWetnessScore(sample.soilMoisture);
  const impact =
    weightedMean([
      { weight: 0.72, value: rain },
      { weight: 0.18, value: persist },
      { weight: 0.1, value: wetSoil },
    ]) ?? 0;

  const setupN = setup ?? 0;
  const instN = instability ?? 0;
  const watch = {
    floodProne: ctx.floodProne,
    precip24hMm: ctx.precip24hMm,
    precip48hMm: ctx.precip48hMm ?? null,
  };
  const upscale = danaRainWatch(setupN, watch);
  const level = classifyLevel(setupN, impact, instN, watch);
  const g = thermalGradientC(sample);

  return {
    time: sample.time,
    level,
    rain: rain ?? 0,
    setup: setupN,
    instability: instN,
    impact,
    floodGate: floodGateOpen(impact) || upscale >= 3,
    factors: {
      rain: rain ?? undefined,
      setup: setup ?? undefined,
      instability: instability ?? undefined,
      persistence: persist ?? undefined,
      moisture: sample.dewPoint2m === null ? undefined : moistureScore(sample.dewPoint2m),
      moisture850: sample.relativeHumidity850 === null ? undefined : moisture850Score(sample.relativeHumidity850),
      pwat: sample.pwat === null ? undefined : pwatScore(sample.pwat),
      sst: sample.sst === null ? undefined : sstScore(sample.sst),
      coldCore: sample.temperature500 === null ? undefined : coldCoreScore(sample.temperature500),
      geopotential: sample.geopotential500 === null ? undefined : geopotentialScore(sample.geopotential500),
      onshore: blendedOnshoreScore(sample, ctx) ?? undefined,
      cape: sample.cape === null ? undefined : capeScore(sample.cape),
      gradient: g === null ? undefined : thermalGradientScore(g),
      lifted: sample.liftedIndex === null ? undefined : liftedIndexScore(sample.liftedIndex),
      cin: sample.convectiveInhibition === null ? undefined : cinScore(sample.convectiveInhibition),
      soil: wetSoil ?? undefined,
    },
    thermalGradientC: g,
    precip24hMm: ctx.precip24hMm,
    precip48hMm: ctx.precip48hMm ?? null,
    precipHourMm: sample.precipitation,
    cape: sample.cape,
    sst: sample.sst,
    temperature2m: sample.temperature2m,
    temperature500: sample.temperature500,
    gustKmh: sample.windGusts10m,
    liftedIndex: sample.liftedIndex,
    relativeHumidity850: sample.relativeHumidity850,
  };
}

export function scoreSeries(
  samples: HourSample[],
  floodProne: boolean,
  onshoreFrom: number | null,
  onshoreTo: number | null,
): HourScore[] {
  const precip = samples.map((s) => s.precipitation);
  return samples.map((sample, i) =>
    scoreHour(sample, {
      floodProne,
      onshoreFrom,
      onshoreTo,
      precip24hMm: rollingSum(precip, i, 24),
      precip48hMm: rollingSum(precip, i, 48),
      persistWetHours: wetHourCount(precip, i, 6, 1),
    }),
  );
}

export function betterHour(a: HourScore, b: HourScore): HourScore {
  if (a.level !== b.level) return a.level > b.level ? a : b;
  if (a.impact !== b.impact) return a.impact > b.impact ? a : b;
  return a.setup >= b.setup ? a : b;
}

/**
 * Colour for the day strip and map: how the day looks as a whole.
 * Hour bars stay honest. Red/purple if any hour is a real flood threat.
 * Orange only with rain on the ground. A dry cold pool does not paint the day.
 */
export function dayWatchLevel(
  hours: ReadonlyArray<{ level: number; floodGate?: boolean; precip24hMm?: number | null }>,
): RiskLevel {
  if (hours.length === 0) return 0;
  let peak = 0;
  let unsettledHours = 0;
  let wetThreat = false;
  for (const h of hours) {
    if (h.level > peak) peak = h.level;
    if (h.level >= 1) unsettledHours += 1;
    if (h.floodGate || (h.precip24hMm ?? 0) >= 8) wetThreat = true;
  }
  if (peak >= 4) return 4;
  if (peak >= 3) return 3;
  if (peak >= 2 && wetThreat) return 2;
  const stretch = Math.max(3, Math.ceil(hours.length * 0.25));
  if (unsettledHours >= stretch) return 1;
  return 0;
}

export function groupDays(hours: HourScore[]): DayScore[] {
  const byDay = new Map<string, HourScore[]>();
  for (const h of hours) {
    const date = h.time.slice(0, 10);
    const list = byDay.get(date) ?? [];
    list.push(h);
    byDay.set(date, list);
  }
  return [...byDay.entries()].flatMap(([date, list]) => {
    const first = list[0];
    if (!first) return [];
    const peak = list.reduce((best, cur) => betterHour(cur, best), first);
    const precipMm = list.reduce((s, h) => s + (h.precipHourMm ?? 0), 0);
    const gusts = list.map((h) => h.gustKmh).filter((g): g is number => g !== null);
    return [
      {
        date,
        level: dayWatchLevel(list),
        precipMm,
        maxGust: gusts.length ? Math.max(...gusts) : null,
        peak,
        hours: list,
      },
    ];
  });
}

export function windowPeak(hours: HourScore[], fromIso: string, horizonHours: number): HourScore | null {
  if (hours.length === 0) return null;
  const start = Date.parse(fromIso);
  const end = start + horizonHours * 3600_000;
  const slice = hours.filter((h) => {
    const t = Date.parse(h.time);
    return Number.isFinite(t) && t >= start && t <= end;
  });
  const use = slice.length > 0 ? slice : hours.slice(0, horizonHours);
  const first = use[0];
  if (!first) return null;
  return use.reduce((best, cur) => betterHour(cur, best), first);
}
