import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ALMERIA_2024_WINDOW, ALMERIA_RAIN, GADOR_RAIN } from "./catalog.ts";
import { parseCsv, type HidrosurClient, type HidrosurStation } from "./client.ts";
import type { SaihPoint } from "../point.ts";

export type AlmeriaRainSeries = {
  id: string;
  sensorId: string;
  stationId: string;
  stationName: string;
  quantity: "rain";
  unit: string;
  kind: string;
  fromLocal: string;
  toLocal: string;
  points: SaihPoint[];
};

export type AlmeriaPull = {
  fromLocal: string;
  toLocal: string;
  stationCount: number;
  cityOnForm: boolean;
  gadorOnForm: boolean;
  city: AlmeriaRainSeries;
  gador: AlmeriaRainSeries;
};

export function almeriaFixturePaths(repoRoot: string): {
  cityJsonl: string;
  cityMeta: string;
  gadorJsonl: string;
  gadorMeta: string;
} {
  const dir = join(repoRoot, "src/saih/hidrosur/fixtures");
  return {
    cityJsonl: join(dir, "089P01-2024-11-almeria.jsonl"),
    cityMeta: join(dir, "089P01-2024-11-almeria.meta.json"),
    gadorJsonl: join(dir, "076P01-2024-11-almeria.jsonl"),
    gadorMeta: join(dir, "076P01-2024-11-almeria.meta.json"),
  };
}

export function findAlmeria(stations: readonly HidrosurStation[]): HidrosurStation | undefined {
  return stations.find(
    (s) => s.id === ALMERIA_RAIN.stationId && s.sensors.some((sensor) => sensor.id === ALMERIA_RAIN.sensorId),
  );
}

export function findGador(stations: readonly HidrosurStation[]): HidrosurStation | undefined {
  return stations.find(
    (s) => s.id === GADOR_RAIN.stationId && s.sensors.some((sensor) => sensor.id === GADOR_RAIN.sensorId),
  );
}

function sumMm(points: readonly SaihPoint[]): number {
  return Math.round(points.reduce((s, p) => s + (p.valor ?? 0), 0) * 10) / 10;
}

function seriesOf(
  spec: { id: string; sensorId: string; stationId: string; unit: string; kind: string },
  stationName: string,
  points: SaihPoint[],
): AlmeriaRainSeries {
  return {
    id: spec.id,
    sensorId: spec.sensorId,
    stationId: spec.stationId,
    stationName,
    quantity: "rain",
    unit: spec.unit,
    kind: spec.kind,
    fromLocal: ALMERIA_2024_WINDOW.fromLocal,
    toLocal: ALMERIA_2024_WINDOW.toLocal,
    points,
  };
}

export async function pullAlmeriaNov2024(client: HidrosurClient): Promise<
  | { ok: true; value: AlmeriaPull }
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
  const city = findAlmeria(catalog.value);
  const gador = findGador(catalog.value);
  if (!city) {
    return {
      ok: false,
      kind: "parse",
      error: `station ${ALMERIA_RAIN.stationId} / ${ALMERIA_RAIN.sensorId} not on the 177-station form — refusing to guess`,
    };
  }
  if (!gador) {
    return {
      ok: false,
      kind: "parse",
      error: `station ${GADOR_RAIN.stationId} / ${GADOR_RAIN.sensorId} not on the 177-station form — refusing to guess`,
    };
  }

  const cityCsv = await client.fetchCsvText({
    fromLocal: ALMERIA_2024_WINDOW.fromLocal,
    toLocal: ALMERIA_2024_WINDOW.toLocal,
    stationId: ALMERIA_RAIN.stationId,
    sensorId: ALMERIA_RAIN.sensorId,
    agrupacion: ALMERIA_RAIN.agrupacion,
  });
  if (!cityCsv.ok) {
    return { ok: false, kind: cityCsv.kind, error: `csv city: ${cityCsv.error}` };
  }

  const gadorCsv = await client.fetchCsvText({
    fromLocal: ALMERIA_2024_WINDOW.fromLocal,
    toLocal: ALMERIA_2024_WINDOW.toLocal,
    stationId: GADOR_RAIN.stationId,
    sensorId: GADOR_RAIN.sensorId,
    agrupacion: GADOR_RAIN.agrupacion,
  });
  if (!gadorCsv.ok) {
    return { ok: false, kind: gadorCsv.kind, error: `csv gador: ${gadorCsv.error}` };
  }

  let cityPoints: SaihPoint[];
  let gadorPoints: SaihPoint[];
  try {
    cityPoints = parseCsv(cityCsv.value, ALMERIA_RAIN.sensorId, "rain");
    gadorPoints = parseCsv(gadorCsv.value, GADOR_RAIN.sensorId, "rain");
  } catch (err) {
    return { ok: false, kind: "parse", error: err instanceof Error ? err.message : "CSV parse" };
  }

  return {
    ok: true,
    value: {
      fromLocal: ALMERIA_2024_WINDOW.fromLocal,
      toLocal: ALMERIA_2024_WINDOW.toLocal,
      stationCount: catalog.value.length,
      cityOnForm: true,
      gadorOnForm: true,
      city: seriesOf(ALMERIA_RAIN, city.name, cityPoints),
      gador: seriesOf(GADOR_RAIN, gador.name, gadorPoints),
    },
  };
}

async function writeRainFixture(
  jsonlPath: string,
  metaPath: string,
  series: AlmeriaRainSeries,
  fetchedAt: string,
  stationCount: number,
  note: string,
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
        stationId: series.stationId,
        sensorId: series.sensorId,
        stationName: series.stationName,
        window: {
          kind: "labelled-event",
          from: series.fromLocal,
          to: series.toLocal,
          timezone: "Europe/Madrid",
          eventId: ALMERIA_2024_WINDOW.eventId,
          comparableToModelDay: false,
        },
        fetchedAt,
        points: series.points.length,
        sumMm: sumMm(series.points),
        stationCountOnForm: stationCount,
        note,
      },
      null,
      2,
    )}\n`,
  );
}

export async function writeAlmeriaFixture(repoRoot: string, pull: AlmeriaPull, fetchedAt: string): Promise<void> {
  const paths = almeriaFixturePaths(repoRoot);
  await writeRainFixture(
    paths.cityJsonl,
    paths.cityMeta,
    pull.city,
    fetchedAt,
    pull.stationCount,
    "City pluvio for the labelled 11 Nov 2024 Poniente rambla day. Not Sierra de Gádor. Not a live harvest. Not wired into the desk score. South belt, does not increment inland-orographic.",
  );
  await writeRainFixture(
    paths.gadorJsonl,
    paths.gadorMeta,
    pull.gador,
    fetchedAt,
    pull.stationCount,
    "Sierra de Gádor (Dalías) orographic pluvio for the labelled 11 Nov 2024 Poniente rambla day. Not the Almería city gauge. Not a live harvest. Not wired into the desk score. South belt, does not increment inland-orographic.",
  );
}
