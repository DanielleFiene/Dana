import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  CARTAMA_FLOW,
  CARTAMA_RAIN,
  CARTAMA_STAGE,
  MALAGA_2024_WINDOW,
} from "./catalog.ts";
import {
  parseCsv,
  type CsvValueKind,
  type HidrosurClient,
  type HidrosurStation,
} from "./client.ts";
import type { SaihPoint } from "../point.ts";

export type CartamaSeries = {
  id: string;
  sensorId: string;
  stationId: string;
  stationName: string;
  quantity: "rain" | "stage" | "flow";
  unit: string;
  kind: string;
  csvColumn?: string;
  fromLocal: string;
  toLocal: string;
  points: SaihPoint[];
};

export type CartamaPull = {
  stationId: string;
  stationName: string;
  fromLocal: string;
  toLocal: string;
  stationCount: number;
  cartamaOnForm: boolean;
  rain: CartamaSeries;
  stage: CartamaSeries;
  flow: CartamaSeries;
};

export function fixtureDir(repoRoot: string): string {
  return join(repoRoot, "src/saih/hidrosur/fixtures");
}

export function fixturePaths(repoRoot: string): {
  rainJsonl: string;
  rainMeta: string;
  stageJsonl: string;
  stageMeta: string;
  flowJsonl: string;
  flowMeta: string;
} {
  const dir = fixtureDir(repoRoot);
  return {
    rainJsonl: join(dir, "038P01-2024-11-malaga.jsonl"),
    rainMeta: join(dir, "038P01-2024-11-malaga.meta.json"),
    stageJsonl: join(dir, "038R03-2024-11-malaga-stage.jsonl"),
    stageMeta: join(dir, "038R03-2024-11-malaga-stage.meta.json"),
    flowJsonl: join(dir, "038R03-2024-11-malaga-flow.jsonl"),
    flowMeta: join(dir, "038R03-2024-11-malaga-flow.meta.json"),
  };
}

export function findCartama(stations: readonly HidrosurStation[]): HidrosurStation | undefined {
  return stations.find(
    (s) =>
      s.id === CARTAMA_RAIN.stationId &&
      s.sensors.some((sensor) => sensor.id === CARTAMA_RAIN.sensorId) &&
      s.sensors.some((sensor) => sensor.id === CARTAMA_STAGE.sensorId),
  );
}

function seriesOf(
  spec: {
    id: string;
    sensorId: string;
    stationId: string;
    stationName: string;
    quantity: "rain" | "stage" | "flow";
    unit: string;
    kind: string;
    csvColumn?: string;
  },
  stationName: string,
  points: SaihPoint[],
): CartamaSeries {
  return {
    id: spec.id,
    sensorId: spec.sensorId,
    stationId: spec.stationId,
    stationName,
    quantity: spec.quantity,
    unit: spec.unit,
    kind: spec.kind,
    csvColumn: spec.csvColumn,
    fromLocal: MALAGA_2024_WINDOW.fromLocal,
    toLocal: MALAGA_2024_WINDOW.toLocal,
    points,
  };
}

export async function pullCartamaMalaga2024(client: HidrosurClient): Promise<
  | { ok: true; value: CartamaPull }
  | { ok: false; error: string; kind: string }
> {
  const seed = await client.seedSession();
  if (!seed.ok) {
    return { ok: false, kind: seed.kind, error: `session: ${seed.error}` };
  }
  const catalog = await client.fetchStations();
  if (!catalog.ok) {
    return { ok: false, kind: catalog.kind, error: `parametros: ${catalog.error}` };
  }
  const cartama = findCartama(catalog.value);
  if (!cartama) {
    return {
      ok: false,
      kind: "parse",
      error: `station ${CARTAMA_RAIN.stationId} / ${CARTAMA_RAIN.sensorId}+${CARTAMA_STAGE.sensorId} not on the 177-station form — refusing to guess`,
    };
  }

  const rainCsv = await client.fetchCsvText({
    fromLocal: MALAGA_2024_WINDOW.fromLocal,
    toLocal: MALAGA_2024_WINDOW.toLocal,
    stationId: CARTAMA_RAIN.stationId,
    sensorId: CARTAMA_RAIN.sensorId,
    agrupacion: CARTAMA_RAIN.agrupacion,
  });
  if (!rainCsv.ok) {
    return { ok: false, kind: rainCsv.kind, error: `csv rain: ${rainCsv.error}` };
  }

  const nivelCsv = await client.fetchCsvText({
    fromLocal: MALAGA_2024_WINDOW.fromLocal,
    toLocal: MALAGA_2024_WINDOW.toLocal,
    stationId: CARTAMA_STAGE.stationId,
    sensorId: CARTAMA_STAGE.sensorId,
    agrupacion: CARTAMA_STAGE.agrupacion,
  });
  if (!nivelCsv.ok) {
    return { ok: false, kind: nivelCsv.kind, error: `csv nivel: ${nivelCsv.error}` };
  }

  let rainPoints: SaihPoint[];
  let stagePoints: SaihPoint[];
  let flowPoints: SaihPoint[];
  try {
    rainPoints = parseCsv(rainCsv.value, CARTAMA_RAIN.sensorId, "rain");
    stagePoints = parseCsv(nivelCsv.value, CARTAMA_STAGE.sensorId, "stage" satisfies CsvValueKind);
    flowPoints = parseCsv(nivelCsv.value, CARTAMA_FLOW.sensorId, "flow");
  } catch (err) {
    return { ok: false, kind: "parse", error: err instanceof Error ? err.message : "CSV parse" };
  }

  return {
    ok: true,
    value: {
      stationId: CARTAMA_RAIN.stationId,
      stationName: cartama.name,
      fromLocal: MALAGA_2024_WINDOW.fromLocal,
      toLocal: MALAGA_2024_WINDOW.toLocal,
      stationCount: catalog.value.length,
      cartamaOnForm: true,
      rain: seriesOf(CARTAMA_RAIN, cartama.name, rainPoints),
      stage: seriesOf(CARTAMA_STAGE, cartama.name, stagePoints),
      flow: seriesOf(CARTAMA_FLOW, cartama.name, flowPoints),
    },
  };
}

function sumMm(points: readonly SaihPoint[]): number {
  return Math.round(points.reduce((s, p) => s + (p.valor ?? 0), 0) * 10) / 10;
}

async function writeSeriesFixture(
  jsonlPath: string,
  metaPath: string,
  series: CartamaSeries,
  fetchedAt: string,
  stationCount: number,
  extra: Record<string, unknown>,
): Promise<void> {
  await mkdir(dirname(jsonlPath), { recursive: true });
  const body = series.points.map((p) => JSON.stringify(p)).join("\n") + (series.points.length ? "\n" : "");
  await writeFile(jsonlPath, body, "utf8");
  await writeFile(
    metaPath,
    `${JSON.stringify(
      {
        id: series.id,
        network: "hidrosur",
        not: "CHG",
        quantity: series.quantity,
        unit: series.unit,
        kind: series.kind,
        csvColumn: series.csvColumn ?? null,
        stationId: series.stationId,
        sensorId: series.sensorId,
        stationName: series.stationName,
        window: {
          kind: "labelled-event",
          from: series.fromLocal,
          to: series.toLocal,
          timezone: "Europe/Madrid",
          eventId: MALAGA_2024_WINDOW.eventId,
          comparableToModelDay: false,
        },
        fetchedAt,
        points: series.points.length,
        ...extra,
        stationCountOnForm: stationCount,
        note: "One-shot historical CSV. Not a live harvest. Not wired into the desk score.",
      },
      null,
      2,
    )}\n`,
  );
}

export async function writeCartamaFixture(repoRoot: string, pull: CartamaPull, fetchedAt: string): Promise<void> {
  const paths = fixturePaths(repoRoot);
  await writeSeriesFixture(paths.rainJsonl, paths.rainMeta, pull.rain, fetchedAt, pull.stationCount, {
    sumMm: sumMm(pull.rain.points),
  });
  const stageMax = pull.stage.points.reduce((m, p) => (p.valor != null && p.valor > m ? p.valor : m), -Infinity);
  const flowMax = pull.flow.points.reduce((m, p) => (p.valor != null && p.valor > m ? p.valor : m), -Infinity);
  await writeSeriesFixture(paths.stageJsonl, paths.stageMeta, pull.stage, fetchedAt, pull.stationCount, {
    maxM: Number.isFinite(stageMax) ? Math.round(stageMax * 100) / 100 : null,
  });
  await writeSeriesFixture(paths.flowJsonl, paths.flowMeta, pull.flow, fetchedAt, pull.stationCount, {
    maxM3s: Number.isFinite(flowMax) ? Math.round(flowMax * 100) / 100 : null,
  });
}
