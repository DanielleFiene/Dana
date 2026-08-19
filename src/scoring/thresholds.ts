/** Named cut-offs so UI, tests and classifyLevel stay in lockstep. */
export const THRESHOLDS = {
  classicDanaSetup: 0.48,
  floodGateImpact: 0.84,
  floodGateSoloImpact: 0.9,
  floodGateMinSetup: 0.28,
  severeImpact: 0.64,
  /** Same as classic DANA: a cut-off plus meaningful rain is already severe. */
  severeSetup: 0.48,
  severeSetupRain: 0.38,
  unsettledImpact: 0.28,
  unsettledInstability: 0.5,
  unsettledSetup: 0.32,
  /**
   * Global models often put 40–60 mm where the Med later sees 150–200 mm.
   * On a flood corridor, a classic DANA plus this much *model* rain is a watch
   * for a major event, not a modest shower.
   */
  danaSeverePrecip24h: 22,
  danaSeverePrecip48h: 45,
  danaExtremePrecip24h: 48,
  danaExtremePrecip48h: 75,
} as const;

export type DanaRainWatch = {
  floodProne: boolean;
  precip24hMm: number | null;
  precip48hMm: number | null;
};

export function floodGateOpen(impact: number): boolean {
  return impact >= THRESHOLDS.floodGateImpact;
}

/** 0 = no upscale, 3 = severe watch, 4 = extreme watch. Flood-prone + DANA only. */
export function danaRainWatch(setup: number, ctx: DanaRainWatch): 0 | 3 | 4 {
  if (!ctx.floodProne || setup < THRESHOLDS.classicDanaSetup) return 0;
  const p24 = ctx.precip24hMm ?? 0;
  const p48 = ctx.precip48hMm ?? 0;
  if (p24 >= THRESHOLDS.danaExtremePrecip24h || p48 >= THRESHOLDS.danaExtremePrecip48h) return 4;
  if (p24 >= THRESHOLDS.danaSeverePrecip24h || p48 >= THRESHOLDS.danaSeverePrecip48h) return 3;
  return 0;
}
