import { describe, expect, it } from "vitest";
import { AROME_FRANCE, aromeForecastUrl, aromeInDomain, aromePrecipAvailable } from "@/api/arome";
import { aromeCovers, corridorBelt, countsTowardInlandAromeRule, INLAND_AROME_RULE_MIN_CELLS } from "@/data/hotspots";
import { countPrecipMembers, ECMWF_ENS_MEMBERS, ensembleUrl } from "@/api/ensemble";
import { compareAromeToMix, formatAromeCompare } from "@/backtest/arome";
import { formatMagreLeadContrast } from "@/backtest/leads";
import type { PlaceDayRow } from "@/backtest/evaluate";
import type { ForecastJson } from "@/api/schemas";

function emptyHourly(): ForecastJson["hourly"] {
  return {
    time: ["2024-10-29T00:00"],
    temperature_2m: [null],
    dew_point_2m: [null],
    relative_humidity_2m: [null],
    precipitation: [null],
    precipitation_probability: [null],
    cape: [null],
    lifted_index: [null],
    convective_inhibition: [null],
    temperature_850hPa: [null],
    relative_humidity_850hPa: [null],
    dew_point_850hPa: [null],
    temperature_500hPa: [null],
    geopotential_height_500hPa: [null],
    wind_speed_10m: [null],
    wind_direction_10m: [null],
    wind_gusts_10m: [null],
    wind_speed_850hPa: [null],
    wind_direction_850hPa: [null],
    wind_speed_700hPa: [null],
    soil_moisture_0_to_7cm: [null],
    weather_code: [null],
    total_column_integrated_water_vapour: [null],
  };
}

describe("AROME source wiring", () => {
  it("calls /v1/meteofrance with an explicit arome_france model, never best_match", () => {
    const url = aromeForecastUrl([{ lat: 39.47, lon: -0.38 }]);
    expect(url.pathname).toBe("/v1/meteofrance");
    expect(url.searchParams.get("models")).toBe(AROME_FRANCE);
    expect(url.searchParams.get("models")).not.toBe("best_match");
  });

  it("covers Valencia, Murcia and Catalonia, not Málaga / Almería / Gibraltar", () => {
    expect(aromeCovers("valencia-horta")).toBe(true);
    expect(aromeCovers("utiel-requena")).toBe(true);
    expect(aromeCovers("murcia")).toBe(true);
    expect(aromeCovers("barcelona")).toBe(true);
    expect(aromeCovers("tarragona")).toBe(true);
    expect(aromeCovers("malaga")).toBe(false);
    expect(aromeCovers("almeria")).toBe(false);
    expect(aromeCovers("gibraltar")).toBe(false);
    expect(corridorBelt("utiel-requena")).toBe("inland-orographic");
    expect(corridorBelt("valencia-horta")).toBe("coastal-plain");
    expect(corridorBelt("murcia")).toBe("inland-basin");
    expect(INLAND_AROME_RULE_MIN_CELLS).toBe(6);
    expect(countsTowardInlandAromeRule("utiel-requena")).toBe(true);
    expect(countsTowardInlandAromeRule("mallorca")).toBe(false);
    expect(countsTowardInlandAromeRule("almeria")).toBe(false);
    expect(countsTowardInlandAromeRule("malaga")).toBe(false);
    expect(countsTowardInlandAromeRule("gibraltar")).toBe(false);
    expect(countsTowardInlandAromeRule("murcia")).toBe(false);
  });

  it("treats NaN latitude as out of domain", () => {
    expect(aromeInDomain({ latitude: Number.NaN })).toBe(false);
    expect(aromeInDomain({ latitude: 39.47 })).toBe(true);
  });

  it("flags an empty AROME archive so 2023 Murcia is not a model miss", () => {
    const fc: ForecastJson = {
      latitude: 38,
      longitude: -1.13,
      timezone: "Europe/Madrid",
      hourly: emptyHourly(),
    };
    expect(aromePrecipAvailable(fc)).toBe(false);
  });
});

describe("ECMWF ENS probe shape", () => {
  it("counts control + 50 members as 51", () => {
    const hourly: Record<string, unknown> = { time: [], precipitation: [] };
    for (let i = 1; i <= 50; i += 1) hourly[`precipitation_member${String(i).padStart(2, "0")}`] = [];
    expect(countPrecipMembers(hourly)).toBe(ECMWF_ENS_MEMBERS);
    const url = ensembleUrl({ lat: 39.389, lon: -0.71 });
    expect(url.hostname).toBe("ensemble-api.open-meteo.com");
    expect(url.searchParams.get("models")).toBe("ecmwf_ifs025_ensemble");
  });
});

describe("AROME vs mix deltas", () => {
  const mixRow = (over: Partial<PlaceDayRow> & Pick<PlaceDayRow, "hotspotId" | "verdict">): PlaceDayRow => ({
    name: over.hotspotId,
    date: "2024-10-29",
    dayLevel: 3,
    peakHourLevel: 3,
    precipMm: 10,
    maxSetup: 0.5,
    maxImpact: 0.5,
    expected: "quiet",
    deskMechanism: null,
    margin: null,
    ...over,
  });

  it("marks a new false alarm and an out-of-domain Magre Málaga square separately", () => {
    const wet: ForecastJson = {
      latitude: 39.47,
      longitude: -0.38,
      timezone: "Europe/Madrid",
      hourly: { ...emptyHourly(), precipitation: [12] },
    };
    const deltas = compareAromeToMix(
      {
        event: { id: "2024-10-magre" },
        rows: [
          mixRow({ hotspotId: "valencia-horta", expected: "quiet", verdict: "ok-quiet" }),
          mixRow({ hotspotId: "malaga", expected: "riuada", verdict: "hit" }),
        ],
      },
      {
        rows: [
          mixRow({
            hotspotId: "valencia-horta",
            expected: "quiet",
            verdict: "false-alarm",
            precipMm: 40,
            deskMechanism: "leftover-rain",
          }),
        ],
      },
      new Map([
        ["valencia-horta", wet],
      ]),
    );
    expect(deltas.find((d) => d.hotspotId === "valencia-horta")?.kind).toBe("new-false-alarm");
    expect(deltas.find((d) => d.hotspotId === "valencia-horta")?.aromeDesk).toBe("leftover-rain");
    expect(deltas.find((d) => d.hotspotId === "malaga")?.kind).toBe("out-of-domain");
    const text = formatAromeCompare(deltas);
    expect(text).toContain("leftover-rain");
    expect(text).toContain("not an AROME-FA bucket");
    expect(text).toContain("Grid-undercatch remains");
  });

  it("keeps an empty AROME archive off the inland/coast tally", () => {
    const empty: ForecastJson = {
      latitude: 38,
      longitude: -1.13,
      timezone: "Europe/Madrid",
      hourly: emptyHourly(),
    };
    const deltas = compareAromeToMix(
      {
        event: { id: "2023-09-murcia" },
        rows: [mixRow({ hotspotId: "murcia", date: "2023-09-03", expected: "riuada", verdict: "hit" })],
      },
      { rows: [] },
      new Map([["murcia", empty]]),
    );
    expect(deltas[0]?.kind).toBe("archive-empty");
    const text = formatAromeCompare(deltas);
    expect(text).toContain("not a model miss, not inland/coast");
  });
});

describe("Magre lead framing", () => {
  it("calls AROME less wrong, not correct, against the 700 mm core", () => {
    const text = formatMagreLeadContrast([
      {
        place: "Chiva",
        model: "arome_france",
        analysisMm: 132,
        lead24Mm: 240,
        lead48Mm: null,
        lead72Mm: null,
      },
    ]);
    expect(text).toContain("700");
    expect(text).toContain("3× short");
    expect(text).toContain("621.0");
    expect(text).toContain("8-day episode-sum");
    expect(text).toContain("not rain");
    expect(text).not.toContain("AROME saw it");
  });
});
