export type LngLat = readonly [number, number];

export function isFiniteCoord(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/** Ray-casting point-in-polygon. Ring is [lng, lat][] (GeoJSON order). */
export function pointInRing(lng: number, lat: number, ring: ReadonlyArray<LngLat>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const [xi, yi] = a;
    const [xj, yj] = b;
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Compass bearing in range, including wrap across 0° (e.g. 350–20). */
export function bearingInRange(deg: number, min: number, max: number): boolean {
  const d = ((deg % 360) + 360) % 360;
  const a = ((min % 360) + 360) % 360;
  const b = ((max % 360) + 360) % 360;
  if (a <= b) return d >= a && d <= b;
  return d >= a || d <= b;
}

/** Southwest / northeast corners for MapLibre fitBounds. Ring is [lng, lat][]. */
export function ringBounds(ring: ReadonlyArray<LngLat>): [[number, number], [number, number]] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of ring) {
    if (!pt) continue;
    const [x, y] = pt;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}
