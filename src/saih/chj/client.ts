import { CHJ_ORIGIN, CHJ_TZ, DEFAULT_TIMEOUT_MS } from "./catalog.ts";
import type { SaihPoint } from "../point.ts";

export type ChjPoint = SaihPoint;

export type FetchOk = { ok: true; status: number; points: ChjPoint[] };
export type FetchFail = { ok: false; status: number | null; error: string; points: [] };
export type FetchResult = FetchOk | FetchFail;

const UA = "DANA-desk/1.0 (personal non-commercial SAIH archive; +saih.chj.es)";

export function formatChjLocal(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: CHJ_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;
  const hour = parts.hour;
  const minute = parts.minute;
  const second = parts.second;
  if (!year || !month || !day || !hour || !minute || !second) {
    throw new Error("Europe/Madrid format failed");
  }
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function valorUrl(variableId: string, fromLocal: string, toLocal: string): URL {
  const from = encodeURIComponent(fromLocal);
  const to = encodeURIComponent(toLocal);
  return new URL(`/admin/variables/valor/${encodeURIComponent(variableId)}/${from}/${to}`, CHJ_ORIGIN);
}

export function parseValorResponse(data: unknown): ChjPoint[] {
  if (!Array.isArray(data)) return [];
  const points: ChjPoint[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    if (typeof rec.fecha !== "string" || rec.fecha.length === 0) continue;
    const valor = typeof rec.valor === "number" && Number.isFinite(rec.valor) ? rec.valor : null;
    const estado = typeof rec.estado === "number" && Number.isFinite(rec.estado) ? rec.estado : null;
    points.push({ fecha: rec.fecha, valor, estado });
  }
  return points;
}

export function extractEmbeddedArray(html: string, varName: string): unknown {
  const re = new RegExp(`let ${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const m = html.match(re);
  const raw = m?.[1];
  if (!raw) throw new Error(`embedded let ${varName} array missing`);
  return JSON.parse(raw) as unknown;
}

type FetchLike = typeof fetch;

async function readJson(url: URL, fetchImpl: FetchLike, timeoutMs: number): Promise<{ status: number; data: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text.length === 0 ? null : (JSON.parse(text) as unknown);
    } catch {
      throw Object.assign(new Error(`not JSON (${text.slice(0, 80)})`), { status: res.status });
    }
    if (!res.ok) {
      throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function readText(url: URL, fetchImpl: FetchLike, timeoutMs: number): Promise<{ status: number; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: { Accept: "text/html", "User-Agent": UA },
    });
    const text = await res.text();
    if (!res.ok) {
      throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    }
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

export type ChjClient = {
  fetchValor: (variableId: string, fromLocal: string, toLocal: string) => Promise<FetchResult>;
  fetchHtml: (path: string) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;
};

export function createClient(
  fetchImpl: FetchLike = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): ChjClient {
  return {
    async fetchValor(variableId, fromLocal, toLocal) {
      const url = valorUrl(variableId, fromLocal, toLocal);
      try {
        const { status, data } = await readJson(url, fetchImpl, timeoutMs);
        return { ok: true, status, points: parseValorResponse(data) };
      } catch (err) {
        const status = err && typeof err === "object" && "status" in err ? Number(err.status) : null;
        const name = err instanceof Error ? err.name : "";
        const message =
          name === "AbortError" ? "timeout" : err instanceof Error ? err.message : "network";
        return { ok: false, status: Number.isFinite(status) ? status : null, error: message, points: [] };
      }
    },
    async fetchHtml(path) {
      const url = new URL(path, CHJ_ORIGIN);
      try {
        const { text } = await readText(url, fetchImpl, timeoutMs);
        return { ok: true, text };
      } catch (err) {
        const message = err instanceof Error ? err.message : "network";
        return { ok: false, error: message };
      }
    },
  };
}
