const DANGEROUS = /[<>`"\\]/g;

export function sanitizePlaceName(raw: string): string {
  return raw.replace(DANGEROUS, "").replace(/\s+/g, " ").trim().slice(0, 48);
}

export function sanitizeSearchQuery(raw: string): string {
  return raw.replace(DANGEROUS, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}
