import {
  DEFAULT_GAP_MS,
  DEFAULT_LOOKBACK_HOURS,
  type ResolvedSeries,
} from "./catalog.ts";
import { createClient, formatChjLocal, type ChjClient } from "./client.ts";
import { resolveSeries } from "./resolve.ts";
import { appendPoints } from "./store.ts";

export type SeriesOutcome = {
  id: ResolvedSeries["id"];
  stationCode: string;
  variableId: string;
  kind: ResolvedSeries["kind"];
  resolvedFrom: ResolvedSeries["resolvedFrom"];
  status: "ok" | "empty" | "error";
  httpStatus: number | null;
  fetched: number;
  written: number;
  skipped: number;
  error?: string;
};

export type HarvestReport = {
  harvestedAt: string;
  fromLocal: string;
  toLocal: string;
  rootDir: string;
  outcomes: SeriesOutcome[];
};

export type HarvestOpts = {
  rootDir: string;
  lookbackHours?: number;
  gapMs?: number;
  client?: ChjClient;
  now?: Date;
  log?: (msg: string) => void;
  sleep?: (ms: number) => Promise<void>;
};

export async function harvestOnce(opts: HarvestOpts): Promise<HarvestReport> {
  const log = opts.log ?? ((msg) => process.stderr.write(`${msg}\n`));
  const sleep = opts.sleep ?? defaultSleep;
  const gapMs = opts.gapMs ?? DEFAULT_GAP_MS;
  const lookbackHours = opts.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
  const now = opts.now ?? new Date();
  const from = new Date(now.getTime() - lookbackHours * 3600_000);
  const fromLocal = formatChjLocal(from);
  const toLocal = formatChjLocal(now);
  const harvestedAt = now.toISOString();
  const client = opts.client ?? createClient();

  const series = await resolveSeries(client, log);
  const outcomes: SeriesOutcome[] = [];

  for (const [i, s] of series.entries()) {
    if (i > 0 && gapMs > 0) await sleep(gapMs);
    outcomes.push(await harvestSeries(client, opts.rootDir, s, fromLocal, toLocal, harvestedAt, log));
  }

  return { harvestedAt, fromLocal, toLocal, rootDir: opts.rootDir, outcomes };
}

async function harvestSeries(
  client: ChjClient,
  rootDir: string,
  series: ResolvedSeries,
  fromLocal: string,
  toLocal: string,
  harvestedAt: string,
  log: (msg: string) => void,
): Promise<SeriesOutcome> {
  const base = {
    id: series.id,
    stationCode: series.stationCode,
    variableId: series.variableId,
    kind: series.kind,
    resolvedFrom: series.resolvedFrom,
    httpStatus: null as number | null,
    fetched: 0,
    written: 0,
    skipped: 0,
  };
  const result = await client.fetchValor(series.variableId, fromLocal, toLocal);
  if (!result.ok) {
    log(`${series.id} ${series.stationCode}/${series.variableId}: ${result.error} (http ${result.status ?? "—"})`);
    return { ...base, status: "error", httpStatus: result.status, error: result.error };
  }
  if (result.points.length === 0) {
    log(`${series.id} ${series.stationCode}/${series.variableId}: empty`);
    return { ...base, status: "empty", httpStatus: result.status };
  }
  try {
    const { written, skipped } = await appendPoints(rootDir, series, result.points, harvestedAt);
    log(
      `${series.id} ${series.stationCode}/${series.variableId}: fetched ${result.points.length}, wrote ${written}, skipped ${skipped}`,
    );
    return {
      ...base,
      status: "ok",
      httpStatus: result.status,
      fetched: result.points.length,
      written,
      skipped,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "store";
    log(`${series.id} ${series.stationCode}/${series.variableId}: store failed (${message})`);
    return { ...base, status: "error", httpStatus: result.status, fetched: result.points.length, error: message };
  }
}

export function formatReport(report: HarvestReport): string {
  const lines = [
    `CHJ SAIH harvest ${report.harvestedAt}`,
    `window ${report.fromLocal} → ${report.toLocal} (Europe/Madrid)`,
    `dir ${report.rootDir}`,
  ];
  for (const o of report.outcomes) {
    const head = `${o.id.padEnd(12)} ${o.stationCode}/${o.variableId}`;
    if (o.status === "ok") {
      lines.push(`${head}  ok   fetched ${o.fetched}  wrote ${o.written}  skipped ${o.skipped}  (${o.resolvedFrom})`);
    } else if (o.status === "empty") {
      lines.push(`${head}  empty  http ${o.httpStatus ?? "—"}  (${o.resolvedFrom})`);
    } else {
      lines.push(`${head}  error ${o.error ?? ""}  http ${o.httpStatus ?? "—"}  (${o.resolvedFrom})`);
    }
  }
  return lines.join("\n");
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
