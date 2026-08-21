import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALMERIA_RAIN,
  CARTAMA_FLOW,
  CARTAMA_RAIN,
  CARTAMA_STAGE,
  CONFIRMED_ON_FORM,
  FAROLA_RAIN,
  GADOR_RAIN,
  SKIPPED_NO_LABELLED_EVENT,
} from "@/saih/hidrosur/catalog";
import { findAlmeria, findGador, pullAlmeriaNov2024, writeAlmeriaFixture } from "@/saih/hidrosur/fetchAlmeria";
import { findFarola, pullFarolaMalaga2024, writeFarolaFixture } from "@/saih/hidrosur/fetchFarola";
import {
  CookieJar,
  csvUrl,
  looksLikeHtml,
  madridCalendarDate,
  parseCsv,
  parseHidrosurFecha,
  parseHidrosurNumber,
  parseParametros,
  peakOnMadridDate,
  seriesExtreme,
  sumOnMadridDate,
  type HidrosurClient,
} from "@/saih/hidrosur/client";
import { findCartama, pullCartamaMalaga2024, writeCartamaFixture } from "@/saih/hidrosur/fetchCartama";
import {
  CARTAMA_SAIH_FLOW,
  CARTAMA_SAIH_RAIN,
  CARTAMA_SAIH_STAGE,
  FAROLA_SAIH_RAIN,
  ALMERIA_SAIH_RAIN,
  GADOR_SAIH_RAIN,
} from "@/data/probes";

const SAMPLE_CSV = [
  "Estación;Nombre;Sensor;Fecha;Nombre;Acumulado (l/m2)",
  "38;RÍO GUADALHORCE (CARTAMA) (MA);038P01;13/11/2024 11:00;PLUVIÓMETRO;18,80",
  "38;RÍO GUADALHORCE (CARTAMA) (MA);038P01;13/11/2024 12:00;PLUVIÓMETRO;19,20",
  "38;RÍO GUADALHORCE (CARTAMA) (MA);038P01;13/11/2024 13:00;PLUVIÓMETRO;n/d",
  "38;OTRA;999P01;13/11/2024 14:00;PLUVIÓMETRO;99,00",
].join("\r");

const SAMPLE_NIVEL_CSV = [
  "Estación;Nombre;Sensor;Fecha;Nivel (m.);Caudal (m3/s);% Error",
  "38;RÍO GUADALHORCE (CARTAMA) (MA);038R03;13/11/24 18:00;1,84;210,20;0",
  "38;RÍO GUADALHORCE (CARTAMA) (MA);038R03;14/11/24 10:00;3,08;455,59;0",
  "38;RÍO GUADALHORCE (CARTAMA) (MA);038R03;14/11/24 11:00;n/d;n/d;0",
].join("\r");

const SAMPLE_FAROLA_CSV = [
  "Estación;Nombre;Sensor;Fecha;Nombre;Acumulado (l/m2)",
  "22;MÁLAGA - PASEO DE LA FAROLA (MA);022P01;13/11/2024 11:00;PLUVIÓMETRO;12,40",
  "22;MÁLAGA - PASEO DE LA FAROLA (MA);022P01;13/11/2024 12:00;PLUVIÓMETRO;8,10",
  "22;OTRA;999P01;13/11/2024 14:00;PLUVIÓMETRO;99,00",
].join("\r");

const SAMPLE_ALMERIA_CSV = [
  "Estación;Nombre;Sensor;Fecha;Nombre;Acumulado (l/m2)",
  "89;ALMERÍA (AL);089P01;11/11/2024 10:00;PLUVIÓMETRO;6,20",
  "89;ALMERÍA (AL);089P01;11/11/2024 11:00;PLUVIÓMETRO;4,10",
  "89;OTRA;999P01;11/11/2024 12:00;PLUVIÓMETRO;99,00",
].join("\r");

const SAMPLE_GADOR_CSV = [
  "Estación;Nombre;Sensor;Fecha;Nombre;Acumulado (l/m2)",
  "76;SIERRA DE GÁDOR (AL);076P01;11/11/2024 10:00;PLUVIÓMETRO;14,80",
  "76;SIERRA DE GÁDOR (AL);076P01;11/11/2024 11:00;PLUVIÓMETRO;9,40",
  "76;OTRA;999P01;11/11/2024 12:00;PLUVIÓMETRO;99,00",
].join("\r");

describe("Hidrosur CSV parse", () => {
  it("turns Cártama hourly rows into SAIH points (ISO UTC, null estado)", () => {
    const points = parseCsv(SAMPLE_CSV, "038P01");
    expect(points).toEqual([
      { fecha: "2024-11-13T10:00:00.000Z", valor: 18.8, estado: null },
      { fecha: "2024-11-13T11:00:00.000Z", valor: 19.2, estado: null },
      { fecha: "2024-11-13T12:00:00.000Z", valor: null, estado: null },
    ]);
  });

  it("parses Spanish decimals and n/d", () => {
    expect(parseHidrosurNumber("18,80")).toBe(18.8);
    expect(parseHidrosurNumber("n/d")).toBeNull();
  });

  it("converts Europe/Madrid wall time, including CEST", () => {
    expect(parseHidrosurFecha("13/11/2024 11:00")).toBe("2024-11-13T10:00:00.000Z");
    expect(parseHidrosurFecha("21/08/2026 11:30")).toBe("2026-08-21T09:30:00.000Z");
  });
});

describe("Hidrosur fail modes", () => {
  it("detects HTML where JSON or CSV was expected", () => {
    expect(looksLikeHtml("<!DOCTYPE html><html>", "text/html; charset=UTF-8")).toBe(true);
    expect(looksLikeHtml('{"38":{}}', "application/json")).toBe(false);
  });

  it("stores ci_session from Set-Cookie", () => {
    const jar = new CookieJar();
    const headers = new Headers();
    headers.append("set-cookie", "ci_session=abc; Path=/; HttpOnly");
    jar.absorb(headers);
    expect(jar.has("ci_session")).toBe(true);
    expect(jar.header()).toBe("ci_session=abc");
  });
});

describe("Hidrosur catalog", () => {
  it("parses the 177-station parametros map and refuses to invent Cártama", () => {
    const stations = parseParametros({
      "38": {
        nombre: "RÍO GUADALHORCE (CÁRTAMA) (MA)",
        subsistema: "subsistema I4",
        tipoestacion: ["A"],
        sensores: ["038P01", "038R03", "038X01"],
        nombres: ["PLUVIÓMETRO", "NIVEL OJO DCHO", "TENSIÓN DE BATERÍAS"],
      },
    });
    expect(findCartama(stations)?.sensors.map((s) => s.id)).toEqual(["038P01", "038R03", "038X01"]);
    expect(findCartama([])).toBeUndefined();
    expect(findFarola([])).toBeUndefined();
    expect(CARTAMA_RAIN.sensorId).toBe("038P01");
    expect(CARTAMA_STAGE.sensorId).toBe("038R03");
    expect(CARTAMA_STAGE.quantity).toBe("stage");
    expect(CARTAMA_FLOW.sensorId).toBe("038R03");
    expect(CARTAMA_FLOW.quantity).toBe("flow");
    expect(CARTAMA_FLOW.id).not.toBe(CARTAMA_STAGE.id);
    expect(findCartama(parseParametros({
      "38": {
        nombre: "RÍO GUADALHORCE (CÁRTAMA) (MA)",
        subsistema: "I4",
        tipoestacion: ["A"],
        sensores: ["038P01"],
        nombres: ["PLUVIÓMETRO"],
      },
    }))).toBeUndefined();
    expect(CONFIRMED_ON_FORM.some((s) => s.sensorId === "038P01")).toBe(true);
    expect(CONFIRMED_ON_FORM.some((s) => s.sensorId === "038R03" && s.letter === "R")).toBe(true);
    expect(CONFIRMED_ON_FORM.some((s) => s.sensorId === "022P01")).toBe(true);
    expect(FAROLA_RAIN.sensorId).toBe("022P01");
    expect(FAROLA_RAIN.stationId).toBe("22");
    expect(FAROLA_RAIN.quantity).toBe("rain");
    expect(ALMERIA_RAIN.sensorId).toBe("089P01");
    expect(ALMERIA_RAIN.stationId).toBe("89");
    expect(GADOR_RAIN.sensorId).toBe("076P01");
    expect(GADOR_RAIN.stationId).toBe("76");
    expect(SKIPPED_NO_LABELLED_EVENT).toEqual(["011P01", "008P01", "003P01"]);
    expect(CONFIRMED_ON_FORM.some((s) => s.sensorId === "089P01")).toBe(true);
    expect(CONFIRMED_ON_FORM.some((s) => s.sensorId === "076P01")).toBe(true);
  });

  it("puts agrupacion and the Cártama sensor on the CSV URL", () => {
    const url = csvUrl({
      fromLocal: "11/11/2024 00:00",
      toLocal: "15/11/2024 23:59",
      stationId: "38",
      sensorId: "038P01",
    });
    expect(url.pathname).toBe("/saih/datos/a/la/carta/csv");
    expect(url.searchParams.get("estacion")).toBe("38");
    expect(url.searchParams.get("sensor")).toBe("038P01");
    expect(url.searchParams.get("agrupacion")).toBe("60");
  });
});

function mockClient(opts: {
  seed?: boolean;
  stations?: ReturnType<typeof parseParametros>;
  csv?: string;
  nivelCsv?: string;
  csvError?: { kind: "empty" | "csv-404" | "session"; error: string };
}): HidrosurClient {
  return {
    jar: new CookieJar(),
    async seedSession() {
      if (opts.seed === false) return { ok: false, kind: "session", status: 200, error: "no ci_session" };
      return { ok: true, status: 200, value: { hasCiSession: true } };
    },
    async fetchStations() {
      const stations = opts.stations ?? parseParametros({
        "38": {
          nombre: "RÍO GUADALHORCE (CÁRTAMA) (MA)",
          subsistema: "I4",
          tipoestacion: ["A"],
          sensores: ["038P01", "038R03"],
          nombres: ["PLUVIÓMETRO", "NIVEL OJO DCHO"],
        },
      });
      return { ok: true, status: 200, value: stations };
    },
    async fetchCsvText(req) {
      if (opts.csvError) return { ok: false, kind: opts.csvError.kind, status: 200, error: opts.csvError.error };
      if (req.sensorId === CARTAMA_STAGE.sensorId) {
        return { ok: true, status: 200, value: opts.nivelCsv ?? SAMPLE_NIVEL_CSV };
      }
      if (req.sensorId === ALMERIA_RAIN.sensorId) {
        return { ok: true, status: 200, value: SAMPLE_ALMERIA_CSV };
      }
      if (req.sensorId === GADOR_RAIN.sensorId) {
        return { ok: true, status: 200, value: SAMPLE_GADOR_CSV };
      }
      return { ok: true, status: 200, value: opts.csv ?? SAMPLE_CSV };
    },
    async fetchCsv(req) {
      const text = await this.fetchCsvText(req);
      if (!text.ok) return text;
      return {
        ok: true,
        status: 200,
        value: parseCsv(text.value, req.sensorId, req.valueKind ?? "rain"),
      };
    },
  };
}

describe("Hidrosur Cártama pull", () => {
  it("writes a fixture and does not mix session failure with an empty CSV", async () => {
    const session = await pullCartamaMalaga2024(mockClient({ seed: false }));
    expect(session.ok).toBe(false);
    if (!session.ok) expect(session.kind).toBe("session");

    const empty = await pullCartamaMalaga2024(mockClient({ csvError: { kind: "empty", error: "empty CSV body" } }));
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.kind).toBe("empty");

    const dir = await mkdtemp(join(tmpdir(), "hidrosur-"));
    const pull = await pullCartamaMalaga2024(mockClient({}));
    expect(pull.ok).toBe(true);
    if (!pull.ok) return;
    await writeCartamaFixture(dir, pull.value, "2026-08-21T10:00:00.000Z");
    const jsonl = await readFile(join(dir, "src/saih/hidrosur/fixtures/038P01-2024-11-malaga.jsonl"), "utf8");
    expect(jsonl).toContain("2024-11-13T10:00:00.000Z");
    expect(jsonl).not.toContain("99");
    const stageJsonl = await readFile(join(dir, "src/saih/hidrosur/fixtures/038R03-2024-11-malaga-stage.jsonl"), "utf8");
    const flowJsonl = await readFile(join(dir, "src/saih/hidrosur/fixtures/038R03-2024-11-malaga-flow.jsonl"), "utf8");
    expect(stageJsonl).toContain('"valor":3.08');
    expect(flowJsonl).toContain('"valor":455.59');
    expect(stageJsonl).not.toContain("455.59");
    expect(pull.value.stage.quantity).toBe("stage");
    expect(pull.value.flow.quantity).toBe("flow");
  });

  it("keeps the labelled 13 Nov 2024 Cártama hours on disk", async () => {
    const raw = await readFile(new URL("./fixtures/038P01-2024-11-malaga.jsonl", import.meta.url), "utf8");
    const points = raw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { fecha: string; valor: number | null; estado: null });
    expect(points).toHaveLength(120);
    expect(sumOnMadridDate(points, "2024-11-13")).toBeCloseTo(CARTAMA_SAIH_RAIN.dayMm, 5);
    expect(peakOnMadridDate(points, "2024-11-13")?.valor).toBeCloseTo(CARTAMA_SAIH_RAIN.peakHourMm, 5);
    const episode = ["2024-11-11", "2024-11-12", "2024-11-13", "2024-11-14", "2024-11-15"].reduce(
      (s, d) => s + sumOnMadridDate(points, d),
      0,
    );
    expect(episode).toBeCloseTo(CARTAMA_SAIH_RAIN.episode.mm, 5);
  });

  it("keeps 038R03 nivel and caudal as separate series", async () => {
    const stageRaw = await readFile(new URL("./fixtures/038R03-2024-11-malaga-stage.jsonl", import.meta.url), "utf8");
    const flowRaw = await readFile(new URL("./fixtures/038R03-2024-11-malaga-flow.jsonl", import.meta.url), "utf8");
    const stage = stageRaw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { fecha: string; valor: number | null; estado: null });
    const flow = flowRaw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { fecha: string; valor: number | null; estado: null });
    expect(stage).toHaveLength(120);
    expect(flow).toHaveLength(120);
    expect(peakOnMadridDate(stage, "2024-11-13")?.valor).toBeCloseTo(CARTAMA_SAIH_STAGE.day13MaxM, 2);
    expect(seriesExtreme(stage)?.max).toBeCloseTo(CARTAMA_SAIH_STAGE.peakM, 2);
    expect(madridCalendarDate(seriesExtreme(stage)!.atMax)).toBe("2024-11-14");
    expect(peakOnMadridDate(flow, "2024-11-13")?.valor).toBeCloseTo(CARTAMA_SAIH_FLOW.day13MaxM3s, 1);
    expect(seriesExtreme(flow)?.max).toBeCloseTo(CARTAMA_SAIH_FLOW.peakM3s, 1);
  });

  it("reads nivel and caudal from different 038R03 columns", () => {
    const stage = parseCsv(SAMPLE_NIVEL_CSV, "038R03", "stage");
    const flow = parseCsv(SAMPLE_NIVEL_CSV, "038R03", "flow");
    expect(stage.map((p) => p.valor)).toEqual([1.84, 3.08, null]);
    expect(flow.map((p) => p.valor)).toEqual([210.2, 455.59, null]);
    expect(stage[0]?.fecha).toBe("2024-11-13T17:00:00.000Z");
    expect(madridCalendarDate("2024-11-12T23:00:00.000Z")).toBe("2024-11-13");
    expect(madridCalendarDate("2024-11-14T09:00:00.000Z")).toBe("2024-11-14");
  });
});

describe("Hidrosur Farola pull", () => {
  const farolaStations = parseParametros({
    "22": {
      nombre: "MÁLAGA - PASEO DE LA FAROLA (MA)",
      subsistema: "I4",
      tipoestacion: ["A"],
      sensores: ["022P01"],
      nombres: ["PLUVIÓMETRO"],
    },
  });

  it("refuses to invent Farola when the station is missing", async () => {
    const miss = await pullFarolaMalaga2024(mockClient({}));
    expect(miss.ok).toBe(false);
    if (!miss.ok) expect(miss.kind).toBe("parse");
  });

  it("writes a city-core rain fixture without mixing Cártama ids", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hidrosur-farola-"));
    const pull = await pullFarolaMalaga2024(
      mockClient({
        stations: farolaStations,
        csv: SAMPLE_FAROLA_CSV,
      }),
    );
    expect(pull.ok).toBe(true);
    if (!pull.ok) return;
    expect(pull.value.rain.sensorId).toBe("022P01");
    expect(pull.value.rain.stationId).toBe("22");
    expect(pull.value.rain.points.map((p) => p.valor)).toEqual([12.4, 8.1]);
    await writeFarolaFixture(dir, pull.value, "2026-08-21T12:00:00.000Z");
    const jsonl = await readFile(join(dir, "src/saih/hidrosur/fixtures/022P01-2024-11-malaga.jsonl"), "utf8");
    expect(jsonl).toContain("12.4");
    expect(jsonl).not.toContain("99");
    expect(jsonl).not.toContain("038P01");
  });

  it("keeps the labelled 13 Nov 2024 Farola hours on disk", async () => {
    const raw = await readFile(new URL("./fixtures/022P01-2024-11-malaga.jsonl", import.meta.url), "utf8");
    const points = raw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { fecha: string; valor: number | null; estado: null });
    expect(points).toHaveLength(120);
    expect(sumOnMadridDate(points, "2024-11-13")).toBeCloseTo(FAROLA_SAIH_RAIN.dayMm, 5);
    expect(peakOnMadridDate(points, "2024-11-13")?.valor).toBeCloseTo(FAROLA_SAIH_RAIN.peakHourMm, 5);
    const episode = ["2024-11-11", "2024-11-12", "2024-11-13", "2024-11-14", "2024-11-15"].reduce(
      (s, d) => s + sumOnMadridDate(points, d),
      0,
    );
    expect(episode).toBeCloseTo(FAROLA_SAIH_RAIN.episode.mm, 5);
  });
});

describe("Hidrosur Almería pull", () => {
  const almeriaStations = parseParametros({
    "89": {
      nombre: "ALMERÍA (AL)",
      subsistema: "III",
      tipoestacion: ["M"],
      sensores: ["089P01"],
      nombres: ["PLUVIÓMETRO"],
    },
    "76": {
      nombre: "SIERRA DE GÁDOR (AL)",
      subsistema: "III",
      tipoestacion: ["M"],
      sensores: ["076P01"],
      nombres: ["PLUVIÓMETRO"],
    },
  });

  it("refuses to invent Almería or Gádor when the station is missing", async () => {
    const miss = await pullAlmeriaNov2024(mockClient({}));
    expect(miss.ok).toBe(false);
    if (!miss.ok) expect(miss.kind).toBe("parse");
    expect(findAlmeria([])).toBeUndefined();
    expect(findGador([])).toBeUndefined();
  });

  it("writes city and Gádor rain fixtures without mixing Cártama or Farola ids", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hidrosur-almeria-"));
    const pull = await pullAlmeriaNov2024(mockClient({ stations: almeriaStations }));
    expect(pull.ok).toBe(true);
    if (!pull.ok) return;
    expect(pull.value.city.sensorId).toBe("089P01");
    expect(pull.value.gador.sensorId).toBe("076P01");
    expect(pull.value.city.points.map((p) => p.valor)).toEqual([6.2, 4.1]);
    expect(pull.value.gador.points.map((p) => p.valor)).toEqual([14.8, 9.4]);
    await writeAlmeriaFixture(dir, pull.value, "2026-08-21T15:00:00.000Z");
    const city = await readFile(join(dir, "src/saih/hidrosur/fixtures/089P01-2024-11-almeria.jsonl"), "utf8");
    const gador = await readFile(join(dir, "src/saih/hidrosur/fixtures/076P01-2024-11-almeria.jsonl"), "utf8");
    expect(city).toContain("6.2");
    expect(gador).toContain("14.8");
    expect(city).not.toContain("99");
    expect(gador).not.toContain("99");
    expect(city).not.toContain("038P01");
    expect(city).not.toContain("022P01");
  });

  it("keeps the labelled 11 Nov 2024 Almería hours on disk", async () => {
    const cityRaw = await readFile(new URL("./fixtures/089P01-2024-11-almeria.jsonl", import.meta.url), "utf8");
    const gadorRaw = await readFile(new URL("./fixtures/076P01-2024-11-almeria.jsonl", import.meta.url), "utf8");
    const city = cityRaw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { fecha: string; valor: number | null; estado: null });
    const gador = gadorRaw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { fecha: string; valor: number | null; estado: null });
    expect(city).toHaveLength(120);
    expect(gador).toHaveLength(120);
    expect(sumOnMadridDate(city, "2024-11-11")).toBeCloseTo(ALMERIA_SAIH_RAIN.dayMm, 5);
    expect(sumOnMadridDate(gador, "2024-11-11")).toBeCloseTo(GADOR_SAIH_RAIN.dayMm, 5);
    const episodeDays = ["2024-11-09", "2024-11-10", "2024-11-11", "2024-11-12", "2024-11-13"];
    expect(episodeDays.reduce((s, d) => s + sumOnMadridDate(city, d), 0)).toBeCloseTo(ALMERIA_SAIH_RAIN.episode.mm, 5);
    expect(episodeDays.reduce((s, d) => s + sumOnMadridDate(gador, d), 0)).toBeCloseTo(GADOR_SAIH_RAIN.episode.mm, 5);
    expect(peakOnMadridDate(gador, "2024-11-13")?.valor).toBeCloseTo(GADOR_SAIH_RAIN.peakHourMm, 5);
  });
});

