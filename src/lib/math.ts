export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Piecewise linear interpolation. Points are sorted by x (either rising or falling input is fine). */
export function piecewise(x: number, points: ReadonlyArray<readonly [number, number]>): number {
  if (points.length === 0) return 0;
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < pts.length; i += 1) {
    const prev = pts[i - 1];
    const next = pts[i];
    if (!prev || !next) continue;
    if (x <= next[0]) {
      const span = next[0] - prev[0];
      const t = span === 0 ? 0 : (x - prev[0]) / span;
      return prev[1] + clamp(t, 0, 1) * (next[1] - prev[1]);
    }
  }
  return last[1];
}

export function weightedMean(
  parts: ReadonlyArray<{ weight: number; value: number | null }>,
): number | null {
  let w = 0;
  let s = 0;
  for (const part of parts) {
    if (part.value === null || !Number.isFinite(part.value) || part.weight <= 0) continue;
    w += part.weight;
    s += part.weight * part.value;
  }
  if (w === 0) return null;
  return s / w;
}
