import { bearingInRange } from "@/lib/geo";
import { piecewise, weightedMean } from "@/lib/math";
import type { HourSample, ScoreContext } from "@/types/weather";

/**
 * Mediterranean DANA / gota fría floods are usually warm-rain, moisture-laden and slow.
 * CAPE is often only 500–1500 J/kg. Thermal shock without rain is not a riada.
 *
 * T(2 m) − T(500 hPa) ≈ lapse-rate screen:
 *   ~36 °C over ~5.5 km ≈ 6.5 K/km (standard)
 *   ~54 °C over ~5.5 km ≈ 9.8 K/km (dry adiabatic) — explosive IF moisture exists
 */

export function rainIntensityScore(mmPerHour: number): number {
  return piecewise(mmPerHour, [
    [0, 0],
    [3, 0.18],
    [8, 0.4],
    [15, 0.62],
    [25, 0.82],
    [40, 1],
  ]);
}

export function rain24hScore(mm: number): number {
  return piecewise(mm, [
    [0, 0],
    [10, 0.18],
    [25, 0.38],
    [40, 0.55],
    [60, 0.72],
    [90, 0.88],
    [130, 1],
  ]);
}

/** Stalling DANA: two modest days can flood a rambla even if no hour is violent. */
export function rain48hScore(mm: number): number {
  return piecewise(mm, [
    [0, 0],
    [20, 0.18],
    [40, 0.38],
    [70, 0.6],
    [100, 0.8],
    [150, 1],
  ]);
}

/** Precipitable water (kg/m² ≈ mm). Mediterranean flood fuel sits around 35–45 mm. */
export function pwatScore(kgm2: number): number {
  return piecewise(kgm2, [
    [22, 0],
    [28, 0.4],
    [35, 0.75],
    [42, 1],
  ]);
}

/**
 * Weak 700 hPa flow = the low is not steering away.
 * Only counts when a cold core / low height is already there (a ridge is also slow).
 */
export function stallScore(wind700Kmh: number): number {
  return piecewise(wind700Kmh, [
    [8, 1],
    [18, 0.7],
    [30, 0.35],
    [45, 0],
  ]);
}

export function precipProbScore(percent: number): number {
  return piecewise(percent, [
    [0, 0],
    [20, 0.15],
    [40, 0.35],
    [60, 0.55],
    [80, 0.8],
    [100, 1],
  ]);
}

export function moistureScore(dewPointC: number): number {
  return piecewise(dewPointC, [
    [6, 0],
    [12, 0.25],
    [16, 0.5],
    [19, 0.75],
    [22, 1],
  ]);
}

/** 850 hPa RH is the Mediterranean conveyor: easterlies riding a moist layer. */
export function moisture850Score(rhPercent: number): number {
  return piecewise(rhPercent, [
    [30, 0],
    [50, 0.3],
    [70, 0.6],
    [85, 0.85],
    [95, 1],
  ]);
}

export function sstScore(sstC: number): number {
  return piecewise(sstC, [
    [20, 0.1],
    [24, 0.35],
    [26, 0.55],
    [28, 0.8],
    [30, 1],
  ]);
}

export function coldCoreScore(t500C: number): number {
  return piecewise(t500C, [
    [-8, 0],
    [-12, 0.25],
    [-15, 0.55],
    [-18, 0.8],
    [-22, 1],
  ]);
}

export function geopotentialScore(heightM: number): number {
  return piecewise(heightM, [
    [5880, 0],
    [5760, 0.25],
    [5680, 0.5],
    [5600, 0.78],
    [5520, 1],
  ]);
}

export function thermalGradientScore(deltaC: number): number {
  return piecewise(deltaC, [
    [34, 0],
    [40, 0.35],
    [46, 0.6],
    [52, 0.85],
    [56, 1],
  ]);
}

export function capeScore(capeJkg: number): number {
  return piecewise(capeJkg, [
    [0, 0],
    [500, 0.2],
    [1000, 0.4],
    [1800, 0.65],
    [2500, 0.85],
    [3500, 1],
  ]);
}

/** More negative lifted index → more unstable. */
export function liftedIndexScore(li: number): number {
  return piecewise(li, [
    [4, 0],
    [0, 0.35],
    [-2, 0.55],
    [-4, 0.8],
    [-6, 1],
  ]);
}

/** Low CIN lets storms fire; a strong cap delays them. */
export function cinScore(cinJkg: number): number {
  return piecewise(cinJkg, [
    [0, 1],
    [50, 0.75],
    [150, 0.4],
    [300, 0.15],
    [500, 0],
  ]);
}

export function soilWetnessScore(m3m3: number): number {
  return piecewise(m3m3, [
    [0.12, 0],
    [0.22, 0.35],
    [0.3, 0.7],
    [0.4, 1],
  ]);
}

export function onshoreScore(
  directionDeg: number | null,
  speedKmh: number | null,
  from: number | null,
  to: number | null,
): number | null {
  if (directionDeg === null || speedKmh === null || from === null || to === null) return null;
  if (!bearingInRange(directionDeg, from, to)) return 0;
  return piecewise(speedKmh, [
    [8, 0.15],
    [20, 0.5],
    [35, 0.8],
    [50, 1],
  ]);
}

/** Llevant at 850 hPa is the moisture conveyor; 10 m is a fallback if 850 is missing. */
export function blendedOnshoreScore(sample: HourSample, ctx: ScoreContext): number | null {
  const s850 = onshoreScore(sample.windDirection850, sample.windSpeed850, ctx.onshoreFrom, ctx.onshoreTo);
  const s10 = onshoreScore(sample.windDirection10m, sample.windSpeed10m, ctx.onshoreFrom, ctx.onshoreTo);
  if (s850 === null) return s10;
  if (s10 === null) return s850;
  return Math.max(s850, s10);
}

export function stallContribution(sample: HourSample): number | null {
  if (sample.windSpeed700 === null) return null;
  const core = sample.temperature500 === null ? 0 : coldCoreScore(sample.temperature500);
  const geo = sample.geopotential500 === null ? 0 : geopotentialScore(sample.geopotential500);
  if (core < 0.35 && geo < 0.35) return 0;
  return stallScore(sample.windSpeed700);
}

export function persistenceScore(wetHoursOutOf6: number): number {
  return piecewise(wetHoursOutOf6, [
    [0, 0],
    [2, 0.35],
    [4, 0.7],
    [6, 1],
  ]);
}

export function thermalGradientC(sample: HourSample): number | null {
  if (sample.temperature2m === null || sample.temperature500 === null) return null;
  return sample.temperature2m - sample.temperature500;
}

export function rainBundle(sample: HourSample, ctx: ScoreContext): number | null {
  const thunder =
    sample.weatherCode !== null && sample.weatherCode >= 80 ? 0.2 : sample.weatherCode === null ? null : 0;
  const rain = weightedMean([
    { weight: 0.38, value: ctx.precip24hMm === null ? null : rain24hScore(ctx.precip24hMm) },
    { weight: 0.16, value: ctx.precip48hMm == null ? null : rain48hScore(ctx.precip48hMm) },
    { weight: 0.28, value: sample.precipitation === null ? null : rainIntensityScore(sample.precipitation) },
    {
      weight: 0.13,
      value: sample.precipitationProbability === null ? null : precipProbScore(sample.precipitationProbability),
    },
    { weight: 0.05, value: thunder },
  ]);
  if (rain === null) return null;
  return ctx.floodProne ? Math.min(1, rain * 1.2) : rain;
}

export function setupBundle(sample: HourSample, ctx: ScoreContext): number | null {
  return weightedMean([
    { weight: 0.18, value: sample.temperature500 === null ? null : coldCoreScore(sample.temperature500) },
    { weight: 0.1, value: sample.geopotential500 === null ? null : geopotentialScore(sample.geopotential500) },
    { weight: 0.08, value: sample.dewPoint2m === null ? null : moistureScore(sample.dewPoint2m) },
    { weight: 0.12, value: sample.relativeHumidity850 === null ? null : moisture850Score(sample.relativeHumidity850) },
    { weight: 0.16, value: sample.pwat === null ? null : pwatScore(sample.pwat) },
    { weight: 0.14, value: sample.sst === null ? null : sstScore(sample.sst) },
    { weight: 0.14, value: blendedOnshoreScore(sample, ctx) },
    { weight: 0.04, value: stallContribution(sample) },
    { weight: 0.04, value: sample.convectiveInhibition === null ? null : cinScore(sample.convectiveInhibition) },
  ]);
}

export function instabilityBundle(sample: HourSample): number | null {
  const g = thermalGradientC(sample);
  return weightedMean([
    { weight: 0.34, value: g === null ? null : thermalGradientScore(g) },
    { weight: 0.33, value: sample.cape === null ? null : capeScore(sample.cape) },
    { weight: 0.33, value: sample.liftedIndex === null ? null : liftedIndexScore(sample.liftedIndex) },
  ]);
}
