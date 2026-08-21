import {
  fallbackSeries,
  WANTED_FLOW,
  WANTED_RAIN,
  type ResolvedSeries,
  type WantedRain,
} from "./catalog.ts";
import { extractEmbeddedArray, type ChjClient } from "./client.ts";

type LluviaStation = {
  idEstacionRemota?: unknown;
  fldTNombre?: unknown;
  fldTCodigo?: unknown;
};

type AforoStation = {
  idVariable?: unknown;
  idEstacionRemota?: unknown;
  fldTNombre?: unknown;
  fldTCodigo?: unknown;
  fldTNombreVariable?: unknown;
  fldTTipo?: unknown;
};

type ChartVar = {
  idVariable?: unknown;
  fldTNombre?: unknown;
  unidadVariable?: unknown;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function lluviaStations(html: string): LluviaStation[] {
  const data = extractEmbeddedArray(html, "estaciones");
  return Array.isArray(data) ? (data as LluviaStation[]) : [];
}

function aforoStations(html: string): AforoStation[] {
  const data = extractEmbeddedArray(html, "aforos");
  return Array.isArray(data) ? (data as AforoStation[]) : [];
}

function intensityVariableId(html: string): string | null {
  const data = extractEmbeddedArray(html, "varLluvia");
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0] as ChartVar;
  const id = asString(first.idVariable);
  const name = asString(first.fldTNombre) ?? "";
  if (!id) return null;
  if (name && !/intensidad de lluvia/i.test(name)) return null;
  return id;
}

function findLluvia(stations: LluviaStation[], code: string): LluviaStation | undefined {
  return stations.find((s) => asString(s.fldTCodigo) === code);
}

function findAforo(stations: AforoStation[], code: string): AforoStation | undefined {
  return stations.find((s) => asString(s.fldTCodigo) === code && asString(s.fldTTipo) === "Af");
}

/**
 * Re-read CHJ maps so we do not keep a stale variable id.
 * On any map failure, keep going with the last confirmed fallback.
 */
export async function resolveSeries(
  client: ChjClient,
  log: (msg: string) => void = () => undefined,
): Promise<ResolvedSeries[]> {
  const lluviaPage = await client.fetchHtml("/mapa-lluvias");
  const aforoPage = await client.fetchHtml("/mapa-aforos");
  if (!lluviaPage.ok || !aforoPage.ok) {
    log(
      `maps unavailable (lluvias ${lluviaPage.ok ? "ok" : lluviaPage.error}; aforos ${aforoPage.ok ? "ok" : aforoPage.error}) — using fallback ids`,
    );
    return fallbackSeries();
  }

  let lluvia: LluviaStation[];
  let aforos: AforoStation[];
  try {
    lluvia = lluviaStations(lluviaPage.text);
    aforos = aforoStations(aforoPage.text);
  } catch (err) {
    log(`map parse failed (${err instanceof Error ? err.message : "error"}) — using fallback ids`);
    return fallbackSeries();
  }

  const out: ResolvedSeries[] = [];
  for (const want of WANTED_RAIN) {
    out.push(await resolveRain(client, want, lluvia, log));
  }
  for (const want of WANTED_FLOW) {
    const hit = findAforo(aforos, want.stationCode);
    const variableId = asString(hit?.idVariable);
    const stationId = asString(hit?.idEstacionRemota);
    if (variableId && stationId) {
      if (variableId !== want.fallbackVariableId) {
        log(`${want.id}: aforo variable ${want.fallbackVariableId} → ${variableId}`);
      }
      out.push({
        id: want.id,
        stationCode: want.stationCode,
        stationId,
        stationName: asString(hit?.fldTNombre) ?? want.name,
        variableId,
        kind: want.kind,
        quantity: want.quantity,
        unit: want.unit,
        resolvedFrom: "live-map",
      });
    } else {
      log(`${want.id}: not on mapa-aforos — using fallback ${want.fallbackVariableId}`);
      out.push({
        id: want.id,
        stationCode: want.stationCode,
        stationId: want.fallbackStationId,
        stationName: want.name,
        variableId: want.fallbackVariableId,
        kind: want.kind,
        quantity: want.quantity,
        unit: want.unit,
        resolvedFrom: "fallback",
      });
    }
  }
  return out;
}

async function resolveRain(
  client: ChjClient,
  want: WantedRain,
  lluvia: LluviaStation[],
  log: (msg: string) => void,
): Promise<ResolvedSeries> {
  const hit = findLluvia(lluvia, want.stationCode);
  const stationId = asString(hit?.idEstacionRemota) ?? want.fallbackStationId;
  const stationName = asString(hit?.fldTNombre) ?? want.name;
  if (!hit) {
    log(`${want.id}: ${want.stationCode} missing on mapa-lluvias — using fallback`);
    return { ...fallbackFrom(want), stationName };
  }
  const chart = await client.fetchHtml(`/chart-lluvia/${stationId}`);
  if (!chart.ok) {
    log(`${want.id}: chart-lluvia/${stationId} failed (${chart.error}) — using fallback variable`);
    return {
      id: want.id,
      stationCode: want.stationCode,
      stationId,
      stationName,
      variableId: want.fallbackVariableId,
      kind: want.kind,
      quantity: want.quantity,
      unit: want.unit,
      resolvedFrom: "fallback",
    };
  }
  let variableId: string | null = null;
  try {
    variableId = intensityVariableId(chart.text);
  } catch (err) {
    log(`${want.id}: chart parse failed (${err instanceof Error ? err.message : "error"})`);
  }
  const fromChart = Boolean(variableId);
  if (!variableId) {
    log(`${want.id}: no intensidad variable on chart — using fallback ${want.fallbackVariableId}`);
    variableId = want.fallbackVariableId;
  } else if (variableId !== want.fallbackVariableId) {
    log(`${want.id}: intensity variable ${want.fallbackVariableId} → ${variableId}`);
  }
  return {
    id: want.id,
    stationCode: want.stationCode,
    stationId,
    stationName,
    variableId,
    kind: want.kind,
    quantity: want.quantity,
    unit: want.unit,
    resolvedFrom: fromChart ? "live-map" : "fallback",
  };
}

function fallbackFrom(want: WantedRain): ResolvedSeries {
  return {
    id: want.id,
    stationCode: want.stationCode,
    stationId: want.fallbackStationId,
    stationName: want.name,
    variableId: want.fallbackVariableId,
    kind: want.kind,
    quantity: want.quantity,
    unit: want.unit,
    resolvedFrom: "fallback",
  };
}
