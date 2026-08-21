import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fallbackSeries, WANTED_FLOW, WANTED_RAIN, type ResolvedSeries } from "@/saih/chj/catalog";
import {
  extractEmbeddedArray,
  formatChjLocal,
  parseValorResponse,
  valorUrl,
  type ChjClient,
} from "@/saih/chj/client";
import { harvestOnce } from "@/saih/chj/harvest";
import { parseArgs } from "@/saih/chj/run";
import { resolveSeries } from "@/saih/chj/resolve";
import { appendPoints, seriesPath } from "@/saih/chj/store";

describe("CHJ client", () => {
  it("encodes the local from/to window in the valor URL", () => {
    const url = valorUrl("14079", "2026-08-21 00:00:00", "2026-08-21 12:00:00");
    expect(url.origin).toBe("https://saih.chj.es");
    expect(url.pathname).toBe("/admin/variables/valor/14079/2026-08-21%2000%3A00%3A00/2026-08-21%2012%3A00%3A00");
  });

  it("parses point arrays and treats a bare object as empty", () => {
    expect(parseValorResponse({})).toEqual([]);
    expect(
      parseValorResponse([
        { valor: 1.5, fecha: "2026-08-21T09:30:00.000Z", estado: 128 },
        { valor: "x", fecha: "2026-08-21T09:35:00.000Z", estado: 0 },
        { fecha: "", valor: 2 },
        null,
      ]),
    ).toEqual([
      { fecha: "2026-08-21T09:30:00.000Z", valor: 1.5, estado: 128 },
      { fecha: "2026-08-21T09:35:00.000Z", valor: null, estado: 0 },
    ]);
  });

  it("formats Europe/Madrid wall time for the CHJ path", () => {
    const local = formatChjLocal(new Date("2026-08-21T09:30:00.000Z"));
    expect(local).toBe("2026-08-21 11:30:00");
  });

  it("extracts the embedded let-array CHJ puts in the map HTML", () => {
    const html = `<script>let estaciones = [{"fldTCodigo":"0P09"}];</script>`;
    expect(extractEmbeddedArray(html, "estaciones")).toEqual([{ fldTCodigo: "0P09" }]);
  });
});

describe("CHJ store", () => {
  it("appends new timestamps and skips duplicates", async () => {
    const dir = await mkdtemp(join(tmpdir(), "chj-saih-"));
    const series: ResolvedSeries = {
      id: "chiva-rain",
      stationCode: "0P09",
      stationId: "371",
      stationName: "CHIVA",
      variableId: "14079",
      kind: "rain-intensity",
      quantity: "rain",
      unit: "mm/h",
      resolvedFrom: "fallback",
    };
    const a = { fecha: "2026-08-21T09:30:00.000Z", valor: 1, estado: 0 };
    const b = { fecha: "2026-08-21T09:35:00.000Z", valor: 2, estado: 0 };
    const first = await appendPoints(dir, series, [a, b], "2026-08-21T10:00:00.000Z");
    const second = await appendPoints(dir, series, [b, { fecha: "2026-08-21T09:40:00.000Z", valor: 3, estado: 0 }], "2026-08-21T12:00:00.000Z");
    expect(first).toEqual({ written: 2, skipped: 0 });
    expect(second).toEqual({ written: 1, skipped: 1 });
    const raw = await readFile(seriesPath(dir, series), "utf8");
    const rows = raw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { fecha: string; valor: number });
    expect(rows.map((r) => r.fecha)).toEqual([
      "2026-08-21T09:30:00.000Z",
      "2026-08-21T09:35:00.000Z",
      "2026-08-21T09:40:00.000Z",
    ]);
  });
});

const LLUVIA_HTML = `let estaciones = [
  {"idEstacionRemota":"789","fldTNombre":"MC TURÍS","fldTCodigo":"7R04"},
  {"idEstacionRemota":"371","fldTNombre":"CHIVA","fldTCodigo":"0P09"},
  {"idEstacionRemota":"239","fldTNombre":"UTIEL","fldTCodigo":"0N01"},
  {"idEstacionRemota":"227","fldTNombre":"MC RAMBLA POYO N-III","fldTCodigo":"0O04"}
];`;

const AFOROS_HTML = `let aforos = [
  {"idVariable":"13873","fldTNombre":"MC RAMBLA POYO N-III","fldTTipo":"Af","fldTNombreVariable":"CAUDAL RAMBLA DE POYO","fldTCodigo":"0O04","idEstacionRemota":"227"}
];`;

function chartHtml(variableId: string): string {
  return `let varLluvia = [{"idVariable":"${variableId}","fldTNombre":"INTENSIDAD DE LLUVIA CALCULADA","unidadVariable":"mm/h"}];`;
}

function mockClient(opts: {
  maps?: boolean;
  charts?: Record<string, string>;
  valor?: Record<string, { status?: number; body?: unknown } | { error: string; status?: number }>;
}): ChjClient {
  const charts = opts.charts ?? {
    "789": "16922",
    "371": "14079",
    "239": "14433",
    "227": "13871",
  };
  const valor = opts.valor ?? {};
  return {
    async fetchHtml(path) {
      if (opts.maps === false) return { ok: false, error: "HTTP 500" };
      if (path === "/mapa-lluvias") return { ok: true, text: LLUVIA_HTML };
      if (path === "/mapa-aforos") return { ok: true, text: AFOROS_HTML };
      const stationId = path.match(/^\/chart-lluvia\/(\d+)$/)?.[1];
      const variableId = stationId ? charts[stationId] : undefined;
      if (variableId) return { ok: true, text: chartHtml(variableId) };
      return { ok: false, error: `missing ${path}` };
    },
    async fetchValor(variableId) {
      const row = valor[variableId];
      if (!row) return { ok: true, status: 200, points: [] };
      if ("error" in row) return { ok: false, status: row.status ?? 500, error: row.error, points: [] };
      return {
        ok: true,
        status: row.status ?? 200,
        points: parseValorResponse(row.body ?? []),
      };
    },
  };
}

describe("CHJ resolve", () => {
  it("reads variable ids from the maps, not from station codes", async () => {
    const series = await resolveSeries(mockClient({}));
    expect(series.map((s) => [s.id, s.stationCode, s.variableId])).toEqual([
      ["turis-rain", "7R04", "16922"],
      ["chiva-rain", "0P09", "14079"],
      ["utiel-rain", "0N01", "14433"],
      ["poyo-rain", "0O04", "13871"],
      ["poyo-flow", "0O04", "13873"],
    ]);
    expect(series.every((s) => s.resolvedFrom === "live-map")).toBe(true);
    expect(WANTED_RAIN.find((w) => w.id === "poyo-rain")?.fallbackVariableId).not.toBe("0O04");
    expect(WANTED_FLOW[0]?.fallbackVariableId).toBe("13873");
  });

  it("falls back to the last confirmed ids if the maps are down", async () => {
    const series = await resolveSeries(mockClient({ maps: false }));
    expect(series).toEqual(fallbackSeries());
  });
});

describe("CHJ harvest", () => {
  it("writes good series and keeps going after 5xx or empty", async () => {
    const dir = await mkdtemp(join(tmpdir(), "chj-saih-"));
    const logs: string[] = [];
    const report = await harvestOnce({
      rootDir: dir,
      lookbackHours: 12,
      gapMs: 0,
      now: new Date("2026-08-21T10:00:00.000Z"),
      log: (m) => logs.push(m),
      client: mockClient({
        valor: {
          "16922": {
            body: [{ valor: 4.8, fecha: "2026-08-21T09:30:00.000Z", estado: 0 }],
          },
          "14079": { error: "HTTP 503", status: 503 },
          "14433": { body: [] },
          "13871": {
            body: [{ valor: 0, fecha: "2026-08-21T09:30:00.000Z", estado: 128 }],
          },
          "13873": {
            body: [{ valor: 0.02, fecha: "2026-08-21T09:30:00.000Z", estado: 0 }],
          },
        },
      }),
    });
    const byId = Object.fromEntries(report.outcomes.map((o) => [o.id, o]));
    expect(byId["turis-rain"]?.status).toBe("ok");
    expect(byId["turis-rain"]?.written).toBe(1);
    expect(byId["chiva-rain"]?.status).toBe("error");
    expect(byId["chiva-rain"]?.httpStatus).toBe(503);
    expect(byId["utiel-rain"]?.status).toBe("empty");
    expect(byId["poyo-rain"]?.status).toBe("ok");
    expect(byId["poyo-flow"]?.status).toBe("ok");
    expect(logs.some((l) => l.includes("HTTP 503"))).toBe(true);
    expect(report.outcomes).toHaveLength(5);
  });
});

describe("CHJ cli args", () => {
  it("defaults to one shot and a 72 h lookback", () => {
    const cli = parseArgs(["node", "run.ts"], "/tmp", "/repo");
    expect(cli.once).toBe(true);
    expect(cli.lookbackHours).toBe(72);
    expect(cli.rootDir).toBe(join("/repo", "data/saih/chj"));
  });

  it("parses loop and an explicit archive dir", () => {
    const cli = parseArgs(["node", "run.ts", "--loop", "--dir", "archive", "--lookback-hours", "8"], "/tmp", "/repo");
    expect(cli.once).toBe(false);
    expect(cli.lookbackHours).toBe(8);
    expect(cli.rootDir).toBe(resolve("/tmp", "archive"));
  });
});
