import { THRESHOLDS } from "@/scoring/thresholds";

export type PathId = "setup+impact" | "severe-impact" | "upscale";

export type NamedMargin = {
  name: string;
  value: number;
  threshold: number;
  delta: number;
  ratio: number;
};

export type PathMargin = {
  path: PathId;
  met: boolean;
  /** (value − cut) / cut. Positive = above the path cut. */
  signedRelative: number;
  parts: NamedMargin[];
};

export type HingeMargin = {
  paths: PathMargin[];
  /** Hit: most comfortable met path. FA: tightest met path. Miss / ok-quiet: closest unmet path. */
  binding: PathMargin | null;
  thin: boolean;
  thinParts: NamedMargin[];
};

const THIN_RELATIVE = 0.12;

export function partOf(name: string, value: number, threshold: number): NamedMargin {
  return {
    name,
    value,
    threshold,
    delta: value - threshold,
    ratio: threshold === 0 ? 0 : value / threshold,
  };
}

export function isThinPart(part: NamedMargin): boolean {
  if (part.threshold === 0) return false;
  return Math.abs(part.delta / part.threshold) <= THIN_RELATIVE;
}

function comboPath(setup: number, impact: number): PathMargin {
  const setupPart = partOf("setup", setup, THRESHOLDS.severeSetup);
  const impactPart = partOf("impact", impact, THRESHOLDS.severeSetupRain);
  const setupGap = (THRESHOLDS.severeSetup - setup) / THRESHOLDS.severeSetup;
  const impactGap = (THRESHOLDS.severeSetupRain - impact) / THRESHOLDS.severeSetupRain;
  const met = setup >= THRESHOLDS.severeSetup && impact >= THRESHOLDS.severeSetupRain;
  const signedRelative = met
    ? Math.min(-setupGap, -impactGap)
    : -Math.max(Math.max(0, setupGap), Math.max(0, impactGap));
  return { path: "setup+impact", met, signedRelative, parts: [setupPart, impactPart] };
}

function severeImpactPath(impact: number): PathMargin {
  const part = partOf("impact", impact, THRESHOLDS.severeImpact);
  return {
    path: "severe-impact",
    met: impact >= THRESHOLDS.severeImpact,
    signedRelative: (impact - THRESHOLDS.severeImpact) / THRESHOLDS.severeImpact,
    parts: [part],
  };
}

function upscalePath(
  setup: number,
  precip24hMm: number,
  precip48hMm: number,
  floodProne: boolean,
): PathMargin | null {
  if (!floodProne) return null;
  const setupPart = partOf("setup", setup, THRESHOLDS.classicDanaSetup);
  const mm24 = partOf("precip24h", precip24hMm, THRESHOLDS.danaSeverePrecip24h);
  const mm48 = partOf("precip48h", precip48hMm, THRESHOLDS.danaSeverePrecip48h);
  const setupOk = setup >= THRESHOLDS.classicDanaSetup;
  const rainOk =
    precip24hMm >= THRESHOLDS.danaSeverePrecip24h || precip48hMm >= THRESHOLDS.danaSeverePrecip48h;
  const met = setupOk && rainOk;
  const r24 = (precip24hMm - THRESHOLDS.danaSeverePrecip24h) / THRESHOLDS.danaSeverePrecip24h;
  const r48 = (precip48hMm - THRESHOLDS.danaSeverePrecip48h) / THRESHOLDS.danaSeverePrecip48h;
  const rainBest = Math.max(r24, r48);
  const setupGap = (THRESHOLDS.classicDanaSetup - setup) / THRESHOLDS.classicDanaSetup;
  const signedRelative = setupOk ? rainBest : -Math.max(Math.max(0, setupGap), Math.max(0, -rainBest));
  return { path: "upscale", met, signedRelative, parts: [setupPart, mm24, mm48] };
}

function pickTightest(paths: readonly PathMargin[]): PathMargin {
  return paths.reduce((best, p) => (p.signedRelative < best.signedRelative ? p : best), paths[0]!);
}

function pickMostComfortable(paths: readonly PathMargin[]): PathMargin {
  return paths.reduce((best, p) => (p.signedRelative > best.signedRelative ? p : best), paths[0]!);
}

export function hingeMargin(input: {
  setup: number;
  impact: number;
  precip24hMm: number;
  precip48hMm?: number;
  floodProne: boolean;
  verdict: "hit" | "miss" | "false-alarm" | "ok-quiet" | "unlabelled";
}): HingeMargin {
  const paths = [
    comboPath(input.setup, input.impact),
    severeImpactPath(input.impact),
    upscalePath(input.setup, input.precip24hMm, input.precip48hMm ?? 0, input.floodProne),
  ].filter((p): p is PathMargin => p !== null);

  const met = paths.filter((p) => p.met);
  const unmet = paths.filter((p) => !p.met);
  let binding: PathMargin | null = null;
  if (input.verdict === "hit" && met.length > 0) {
    binding = pickMostComfortable(met);
  } else if (input.verdict === "false-alarm" && met.length > 0) {
    binding = pickTightest(met);
  } else if ((input.verdict === "miss" || input.verdict === "ok-quiet" || input.verdict === "false-alarm") && unmet.length > 0) {
    binding = pickMostComfortable(unmet);
  } else if (met.length > 0) {
    binding = pickTightest(met);
  }

  const thinParts = paths.flatMap((p) => p.parts.filter(isThinPart));
  const thin = binding !== null && Math.abs(binding.signedRelative) <= THIN_RELATIVE;
  return { paths, binding, thin, thinParts };
}

export function formatPathMargin(path: PathMargin): string {
  const rel = path.signedRelative >= 0 ? `+${(path.signedRelative * 100).toFixed(0)}%` : `${(path.signedRelative * 100).toFixed(0)}%`;
  const bits = path.parts.map((p) => {
    if (p.name === "precip24h") return `24h ${p.value.toFixed(0)}/${p.threshold}mm×${p.ratio.toFixed(2)}`;
    if (p.name === "precip48h") return `48h ${p.value.toFixed(0)}/${p.threshold}mm×${p.ratio.toFixed(2)}`;
    return `${p.name} ${p.value.toFixed(2)}/${p.threshold} Δ${p.delta >= 0 ? "+" : ""}${p.delta.toFixed(2)}`;
  });
  return `${path.path} ${path.met ? "met" : "short"} ${rel} (${bits.join("; ")})`;
}

export function formatHingeMargin(margin: HingeMargin): string {
  if (!margin.binding) return "margin —";
  const flag = margin.thin ? " thin" : "";
  return `bind ${formatPathMargin(margin.binding)}${flag}`;
}
