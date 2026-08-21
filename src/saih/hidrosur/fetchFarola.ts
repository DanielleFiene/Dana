import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { FAROLA_RAIN, MALAGA_2024_WINDOW } from "./catalog.ts";
import { parseCsv, type HidrosurClient, type HidrosurStation } from "./client.ts";
import type { SaihPoint } from "../point.ts";

export type FarolaSeries = {
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

export type FarolaPull = {
  stationId: string;
  stationName: string;
  fromLocal: string;
  toLocal: string;
  stationCount: number;
  farolaOnForm: boolean;
  rain: FarolaSeries;
};

export function farolaFixturePaths(repoRoot: string): { rainJsonl: string; rainMeta: string } {
  const dir = join(repoRoot, "src/saih/hidrosur/fixtures");
  return {
    rainJsonl: join(dir, "022P01-2024-11-malaga.jsonl"),
    rainMeta: join(dir, "022P01-2024-11-malaga.meta.json"),
  };
}

export function findFarola(stations: readonly HidrosurStation[]): HidrosurStation | undefined {
  return stations.find(
    (s) => s.id === FAROLA_RAIN.stationId && s.sensors.some((sensor) => sensor.id === FAROLA_RAIN.sensorId),
  );
}

function sumMm(points: readonly SaihPoint[]): number {
  return Math.round(points.reduce((s, p) => s + (p.valor ?? 0), 0) * 10) / 10;
}

export async function pullFarolaMalaga2024(client: HidrosurClient): Promise<
  | { ok: true; value: FarolaPull }
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
  const farola = findFarola(catalog.value);
  if (!farola) {
    return {
      ok: false,
      kind: "parse",
      error: `station ${FAROLA_RAIN.stationId} / ${FAROLA_RAIN.sensorId} not on the 177-station form — refusing to guess`,
    };
  }

  const rainCsv = await client.fetchCsvText({
    fromLocal: MALAGA_2024_WINDOW.fromLocal,
    toLocal: MALAGA_2024_WINDOW.toLocal,
    stationId: FAROLA_RAIN.stationId,
    sensorId: FAROLA_RAIN.sensorId,
    agrupacion: FAROLA_RAIN.agrupacion,
  });
  if (!rainCsv.ok) {
    return { ok: false, kind: rainCsv.kind, error: `csv rain: ${rainCsv.error}` };
  }

  let rainPoints: SaihPoint[];
  try {
    rainPoints = parseCsv(rainCsv.value, FAROLA_RAIN.sensorId, "rain");
  } catch (err) {
    return { ok: false, kind: "parse", error: err instanceof Error ? err.message : "CSV parse" };
  }

  return {
    ok: true,
    value: {
      stationId: FAROLA_RAIN.stationId,
      stationName: farola.name,
      fromLocal: MALAGA_2024_WINDOW.fromLocal,
      toLocal: MALAGA_2024_WINDOW.toLocal,
      stationCount: catalog.value.length,
      farolaOnForm: true,
      rain: {
        id: FAROLA_RAIN.id,
        sensorId: FAROLA_RAIN.sensorId,
        stationId: FAROLA_RAIN.stationId,
        stationName: farola.name,
        quantity: "rain",
        unit: FAROLA_RAIN.unit,
        kind: FAROLA_RAIN.kind,
        fromLocal: MALAGA_2024_WINDOW.fromLocal,
        toLocal: MALAGA_2024_WINDOW.toLocal,
        points: rainPoints,
      },
    },
  };
}

export async function writeFarolaFixture(repoRoot: string, pull: FarolaPull, fetchedAt: string): Promise<void> {
  const paths = farolaFixturePaths(repoRoot);
  await mkdir(dirname(paths.rainJsonl), { recursive: true });
  const body = pull.rain.points.map((p) => JSON.stringify(p)).join("\n") + (pull.rain.points.length ? "\n" : "");
  await writeFile(paths.rainJsonl, body, "utf8");
  await writeFile(
    paths.rainMeta,
    `${JSON.stringify(
      {
        id: pull.rain.id,
        network: "hidrosur",
        not: "CHG",
        quantity: pull.rain.quantity,
        unit: pull.rain.unit,
        kind: pull.rain.kind,
        stationId: pull.rain.stationId,
        sensorId: pull.rain.sensorId,
        stationName: pull.rain.stationName,
        window: {
          kind: "labelled-event",
          from: pull.rain.fromLocal,
          to: pull.rain.toLocal,
          timezone: "Europe/Madrid",
          eventId: MALAGA_2024_WINDOW.eventId,
          comparableToModelDay: false,
        },
        fetchedAt,
        points: pull.rain.points.length,
        sumMm: sumMm(pull.rain.points),
        stationCountOnForm: pull.stationCount,
        note: "City-core pluvio for the labelled 13 Nov 2024 day. Not Cártama. Not a live harvest. Not wired into the desk score. Does not increment inland-orographic.",
      },
      null,
      2,
    )}\n`,
  );
}
