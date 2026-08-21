import {
  AGRUPACION_HOURLY,
  DEFAULT_TIMEOUT_MS,
  HIDROSUR_ORIGIN,
  HIDROSUR_TZ,
} from "./catalog.ts";
import type { SaihPoint } from "../point.ts";

const UA = "DANA-desk/1.0 (personal non-commercial SAIH archive; +redhidrosurmedioambiente.es)";

export type HidrosurFailKind =
  | "session"
  | "portal-html"
  | "empty"
  | "csv-404"
  | "parse"
  | "http"
  | "timeout"
  | "network";

export type HidrosurOk<T> = { ok: true; status: number; value: T };
export type HidrosurFail = {
  ok: false;
  kind: HidrosurFailKind;
  status: number | null;
  error: string;
};
export type HidrosurResult<T> = HidrosurOk<T> | HidrosurFail;

export type HidrosurSensor = { id: string; name: string; letter: string };
export type HidrosurStation = {
  id: string;
  name: string;
  subsystem: string;
  tipos: string[];
  sensors: HidrosurSensor[];
};

type FetchLike = typeof fetch;

export class CookieJar {
  private readonly bag = new Map<string, string>();

  absorb(headers: Headers): void {
    const set = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    for (const raw of set) {
      const nv = raw.split(";")[0];
      if (!nv) continue;
      const eq = nv.indexOf("=");
      if (eq <= 0) continue;
      this.bag.set(nv.slice(0, eq).trim(), nv.slice(eq + 1).trim());
    }
  }

  header(): string | undefined {
    if (this.bag.size === 0) return undefined;
    return [...this.bag.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  has(name: string): boolean {
    return this.bag.has(name);
  }
}

export function looksLikeHtml(text: string, contentType: string | null): boolean {
  const ctype = (contentType ?? "").toLowerCase();
  if (ctype.includes("text/html")) return true;
  const start = text.trimStart().slice(0, 32).toLowerCase();
  return start.startsWith("<!doctype") || start.startsWith("<html");
}

export function parseHidrosurFecha(local: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(local.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] ?? "0");
  if (year < 100) year += 2000;
  if (!day || !month || !year) return null;
  const utcMs = wallTimeInZoneToUtcMs(year, month, day, hour, minute, second, HIDROSUR_TZ);
  return new Date(utcMs).toISOString();
}

function wallTimeInZoneToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): number {
  const utc = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(utc))
      .map((p) => [p.type, p.value]),
  );
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return utc - (asIfUtc - utc);
}

export function parseHidrosurNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t.toLowerCase() === "n/d") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function madridCalendarDate(isoFecha: string): string | null {
  const d = new Date(isoFecha);
  if (Number.isNaN(d.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: HIDROSUR_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  if (!parts.year || !parts.month || !parts.day) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function sumOnMadridDate(points: readonly SaihPoint[], date: string): number {
  let sum = 0;
  for (const p of points) {
    if (madridCalendarDate(p.fecha) !== date) continue;
    sum += p.valor ?? 0;
  }
  return sum;
}

export function peakOnMadridDate(points: readonly SaihPoint[], date: string): { fecha: string; valor: number } | null {
  let best: { fecha: string; valor: number } | null = null;
  for (const p of points) {
    if (madridCalendarDate(p.fecha) !== date || p.valor == null) continue;
    if (!best || p.valor > best.valor) best = { fecha: p.fecha, valor: p.valor };
  }
  return best;
}

export function seriesExtreme(points: readonly SaihPoint[]): { min: number; max: number; atMax: string } | null {
  const nums = points.filter((p) => p.valor != null) as Array<SaihPoint & { valor: number }>;
  if (nums.length === 0) return null;
  let min = nums[0]!.valor;
  let max = nums[0]!.valor;
  let atMax = nums[0]!.fecha;
  for (const p of nums) {
    if (p.valor < min) min = p.valor;
    if (p.valor > max) {
      max = p.valor;
      atMax = p.fecha;
    }
  }
  return { min, max, atMax };
}

export type CsvValueKind = "rain" | "stage" | "flow";

function valueColumnIndex(header: readonly string[], kind: CsvValueKind): number {
  const find = (re: RegExp) => header.findIndex((h) => re.test(h));
  if (kind === "stage") {
    const i = find(/nivel/i);
    if (i < 0) throw new Error("CSV header has no Nivel column");
    return i;
  }
  if (kind === "flow") {
    const i = find(/caudal/i);
    if (i < 0) throw new Error("CSV header has no Caudal column");
    return i;
  }
  const acum = find(/acumulado/i);
  if (acum >= 0) return acum;
  return header.length - 1;
}

export function parseCsv(text: string, sensorId: string, valueKind: CsvValueKind = "rain"): SaihPoint[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((ln) => ln.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvRow(lines[0] ?? "");
  const sensorCol = header.findIndex((h) => /^sensor$/i.test(h.trim()));
  const fechaCol = header.findIndex((h) => /^fecha$/i.test(h.trim()));
  const valueCol = valueColumnIndex(header, valueKind);
  if (fechaCol < 0 || valueCol < 0) {
    throw new Error("CSV header missing Fecha or value column");
  }
  const points: SaihPoint[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvRow(line);
    if (sensorCol >= 0 && cols[sensorCol] !== sensorId) continue;
    const fechaRaw = cols[fechaCol];
    if (!fechaRaw) continue;
    const fecha = parseHidrosurFecha(fechaRaw);
    if (!fecha) continue;
    points.push({
      fecha,
      valor: parseHidrosurNumber(cols[valueCol] ?? ""),
      estado: null,
    });
  }
  return points;
}

function splitCsvRow(line: string): string[] {
  return line.split(";").map((c) => c.trim());
}

export function parseParametros(data: unknown): HidrosurStation[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("parametros JSON is not a station map");
  }
  const out: HidrosurStation[] = [];
  for (const [id, raw] of Object.entries(data as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as Record<string, unknown>;
    const name = typeof rec.nombre === "string" ? rec.nombre : "";
    const subsystem = typeof rec.subsistema === "string" ? rec.subsistema : "";
    const tipos = Array.isArray(rec.tipoestacion) ? rec.tipoestacion.map(String) : [];
    const ids = Array.isArray(rec.sensores) ? rec.sensores.map(String) : [];
    const names = Array.isArray(rec.nombres) ? rec.nombres.map(String) : [];
    const sensors: HidrosurSensor[] = ids.map((sid, i) => ({
      id: sid,
      name: names[i] ?? "",
      letter: sid.length >= 4 ? sid.slice(3, 4) : "",
    }));
    out.push({ id, name, subsystem, tipos, sensors });
  }
  return out;
}

export function csvUrl(opts: {
  fromLocal: string;
  toLocal: string;
  stationId: string;
  sensorId: string;
  agrupacion?: string;
}): URL {
  const url = new URL("/saih/datos/a/la/carta/csv", HIDROSUR_ORIGIN);
  url.searchParams.set("datepickerini", opts.fromLocal);
  url.searchParams.set("datepickerfin", opts.toLocal);
  url.searchParams.set("agrupacion", opts.agrupacion ?? AGRUPACION_HOURLY);
  url.searchParams.set("subsistema", "");
  url.searchParams.set("provincia", "");
  url.searchParams.set("tipoestacion", "");
  url.searchParams.set("estacion", opts.stationId);
  url.searchParams.set("tipo", "");
  url.searchParams.set("sensor", opts.sensorId);
  return url;
}

function fail(kind: HidrosurFailKind, error: string, status: number | null = null): HidrosurFail {
  return { ok: false, kind, status, error };
}

function classifyHttpError(err: unknown): HidrosurFail {
  const status = err && typeof err === "object" && "status" in err ? Number(err.status) : null;
  const name = err instanceof Error ? err.name : "";
  if (name === "AbortError") return fail("timeout", "timeout", status);
  const message = err instanceof Error ? err.message : "network";
  if (typeof status === "number" && Number.isFinite(status) && status >= 400) {
    return fail("http", message, status);
  }
  return fail("network", message, Number.isFinite(status) ? status : null);
}

export type HidrosurClient = {
  jar: CookieJar;
  seedSession: () => Promise<HidrosurResult<{ hasCiSession: boolean }>>;
  fetchStations: () => Promise<HidrosurResult<HidrosurStation[]>>;
  fetchCsv: (opts: {
    fromLocal: string;
    toLocal: string;
    stationId: string;
    sensorId: string;
    agrupacion?: string;
    valueKind?: CsvValueKind;
  }) => Promise<HidrosurResult<SaihPoint[]>>;
  fetchCsvText: (opts: {
    fromLocal: string;
    toLocal: string;
    stationId: string;
    sensorId: string;
    agrupacion?: string;
  }) => Promise<HidrosurResult<string>>;
};

export function createClient(fetchImpl: FetchLike = fetch, timeoutMs = DEFAULT_TIMEOUT_MS): HidrosurClient {
  const jar = new CookieJar();

  async function request(
    url: URL,
    init: RequestInit & { redirect?: RequestRedirect },
  ): Promise<{ status: number; contentType: string | null; text: string; redirected: boolean }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const cookie = jar.header();
      const res = await fetchImpl(url, {
        ...init,
        signal: ctrl.signal,
        headers: {
          "User-Agent": UA,
          Origin: HIDROSUR_ORIGIN,
          Referer: `${HIDROSUR_ORIGIN}/saih/datos/a/la/carta`,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(init.headers ?? {}),
        },
      });
      jar.absorb(res.headers);
      const text = await res.text();
      return {
        status: res.status,
        contentType: res.headers.get("content-type"),
        text,
        redirected: res.redirected,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    jar,
    async seedSession() {
      try {
        const { status, contentType, text } = await request(new URL("/saih/datos/a/la/carta", HIDROSUR_ORIGIN), {
          method: "GET",
          headers: { Accept: "text/html" },
        });
        if (status >= 400) return fail("http", `HTTP ${status} on /carta`, status);
        if (!looksLikeHtml(text, contentType) && text.trim().length === 0) {
          return fail("empty", "empty /carta page", status);
        }
        const hasCiSession = jar.has("ci_session");
        if (!hasCiSession) {
          return fail(
            "session",
            "GET /saih/datos/a/la/carta did not set ci_session — portal session failed (redesign or cookie block)",
            status,
          );
        }
        return { ok: true, status, value: { hasCiSession } };
      } catch (err) {
        return classifyHttpError(err);
      }
    },
    async fetchStations() {
      try {
        const body = new URLSearchParams({
          agrupacion: AGRUPACION_HOURLY,
          subsistema: "",
          provincia: "",
          tipoestacion: "",
          estacion: "",
          tipo: "",
          sensor: "",
        });
        const { status, contentType, text } = await request(
          new URL("/saih/datos/a/la/carta/parametros", HIDROSUR_ORIGIN),
          {
            method: "POST",
            redirect: "manual",
            headers: {
              Accept: "application/json, text/javascript, */*; q=0.01",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "X-Requested-With": "XMLHttpRequest",
            },
            body,
          },
        );
        if (status >= 300 && status < 400) {
          return fail(
            "empty",
            `parametros redirected (${status}) — usually missing agrupacion=60, not a session miss`,
            status,
          );
        }
        if (status >= 400) return fail("http", `HTTP ${status} on /parametros`, status);
        if (text.trim().length === 0) {
          return fail("empty", "empty parametros body (need agrupacion=60; session may also have dropped)", status);
        }
        if (looksLikeHtml(text, contentType)) {
          const kind: HidrosurFailKind = jar.has("ci_session") ? "portal-html" : "session";
          return fail(
            kind,
            kind === "session"
              ? "parametros returned HTML and ci_session is missing — session cookie failed"
              : "parametros returned HTML despite ci_session — portal redesign or login wall",
            status,
          );
        }
        let data: unknown;
        try {
          data = JSON.parse(text) as unknown;
        } catch {
          return fail("parse", `parametros was not JSON (${text.slice(0, 80)})`, status);
        }
        try {
          const stations = parseParametros(data);
          if (stations.length === 0) return fail("empty", "parametros JSON had 0 stations", status);
          return { ok: true, status, value: stations };
        } catch (err) {
          return fail("parse", err instanceof Error ? err.message : "parametros parse", status);
        }
      } catch (err) {
        return classifyHttpError(err);
      }
    },
    async fetchCsvText(opts) {
      try {
        const url = csvUrl(opts);
        const { status, contentType, text } = await request(url, {
          method: "GET",
          headers: { Accept: "text/csv, text/plain, */*" },
        });
        if (status >= 400) return fail("http", `HTTP ${status} on /csv`, status);
        if (text.includes("Error_404")) {
          return fail("csv-404", "CSV body contains Error_404 (Hidrosur does not use HTTP 404)", status);
        }
        if (text.trim().length === 0) {
          return fail("empty", "empty CSV body", status);
        }
        if (looksLikeHtml(text, contentType)) {
          const kind: HidrosurFailKind = jar.has("ci_session") ? "portal-html" : "session";
          return fail(
            kind,
            kind === "session"
              ? "CSV returned HTML and ci_session is missing — session cookie failed"
              : "CSV returned HTML despite ci_session — portal redesign or login wall",
            status,
          );
        }
        return { ok: true, status, value: text };
      } catch (err) {
        return classifyHttpError(err);
      }
    },
    async fetchCsv(opts) {
      const text = await this.fetchCsvText(opts);
      if (!text.ok) return text;
      try {
        return { ok: true, status: text.status, value: parseCsv(text.value, opts.sensorId, opts.valueKind ?? "rain") };
      } catch (err) {
        return fail("parse", err instanceof Error ? err.message : "CSV parse", text.status);
      }
    },
  };
}
