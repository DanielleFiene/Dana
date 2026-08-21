import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ChjPoint } from "./client.ts";
import type { ResolvedSeries } from "./catalog.ts";

export type StoredPoint = ChjPoint;

export function seriesPath(rootDir: string, series: Pick<ResolvedSeries, "stationCode" | "variableId">): string {
  return join(rootDir, series.stationCode, `${series.variableId}.jsonl`);
}

export function metaPath(rootDir: string, series: Pick<ResolvedSeries, "stationCode" | "variableId">): string {
  return join(rootDir, series.stationCode, `${series.variableId}.meta.json`);
}

export async function loadTimestamps(filePath: string): Promise<Set<string>> {
  const seen = new Set<string>();
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (err) {
    if (isNotFound(err)) return seen;
    throw err;
  }
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as { fecha?: unknown };
      if (typeof row.fecha === "string") seen.add(row.fecha);
    } catch {
      // skip a corrupt line; do not abort the archive
    }
  }
  return seen;
}

export async function appendPoints(
  rootDir: string,
  series: ResolvedSeries,
  points: readonly ChjPoint[],
  harvestedAt: string,
): Promise<{ written: number; skipped: number }> {
  const filePath = seriesPath(rootDir, series);
  await mkdir(dirname(filePath), { recursive: true });
  const seen = await loadTimestamps(filePath);
  const lines: string[] = [];
  let skipped = 0;
  for (const p of points) {
    if (seen.has(p.fecha)) {
      skipped += 1;
      continue;
    }
    seen.add(p.fecha);
    lines.push(JSON.stringify({ fecha: p.fecha, valor: p.valor, estado: p.estado }));
  }
  if (lines.length > 0) {
    const chunk = lines.join("\n") + "\n";
    await appendFile(filePath, chunk, "utf8");
  }
  await writeFile(
    metaPath(rootDir, series),
    `${JSON.stringify(
      {
        id: series.id,
        stationCode: series.stationCode,
        stationId: series.stationId,
        stationName: series.stationName,
        variableId: series.variableId,
        kind: series.kind,
        quantity: series.quantity,
        unit: series.unit,
        resolvedFrom: series.resolvedFrom,
        lastHarvestAt: harvestedAt,
        pointsOnDisk: seen.size,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return { written: lines.length, skipped };
}

function isNotFound(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && err.code === "ENOENT");
}
