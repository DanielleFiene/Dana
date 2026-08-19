import { describe, expect, it } from "vitest";
import { danaEventById, type DanaEvent } from "@/data/events";
import { formatReport, shiftIsoDate, summarisePeak, suiteCounts, verdictFor, expectedLabel, type PlaceDayRow, type BacktestSummary } from "@/backtest/evaluate";
import type { RiskLevel } from "@/types/risk";

const magre: DanaEvent = {
  id: "test-magre",
  name: "test Magre",
  startDate: "2024-10-28",
  endDate: "2024-10-30",
  peakDate: "2024-10-29",
  riuadaHotspotIds: ["valencia-horta", "utiel-requena"],
  quietHotspotIds: [],
  notes: "fixture",
};

function row(over: Partial<PlaceDayRow> & Pick<PlaceDayRow, "hotspotId" | "dayLevel" | "expected" | "verdict">): PlaceDayRow {
  return {
    name: over.hotspotId,
    date: "2024-10-29",
    peakHourLevel: over.dayLevel,
    precipMm: 0,
    maxSetup: 0,
    maxImpact: 0,
    ...over,
  };
}

describe("backtest labels", () => {
  it("shifts calendar dates across month bounds", () => {
    expect(shiftIsoDate("2024-10-01", -1)).toBe("2024-09-30");
    expect(shiftIsoDate("2024-10-29", 0)).toBe("2024-10-29");
  });

  it("labels only the peak date", () => {
    expect(expectedLabel(magre, "valencia-horta", "2024-10-29")).toBe("riuada");
    expect(expectedLabel(magre, "valencia-horta", "2024-10-28")).toBe("unlabelled");
    expect(expectedLabel(magre, "mallorca", "2024-10-29")).toBe("unlabelled");
  });

  it("tags Magre 29 Oct by documented floods, not by model colour", () => {
    const event = danaEventById("2024-10-magre");
    expect(event).toBeTruthy();
    expect(expectedLabel(event!, "malaga", "2024-10-29")).toBe("riuada");
    expect(expectedLabel(event!, "murcia", "2024-10-29")).toBe("riuada");
    expect(expectedLabel(event!, "mallorca", "2024-10-29")).toBe("quiet");
    expect(expectedLabel(event!, "barcelona", "2024-10-29")).toBe("quiet");
    expect(expectedLabel(event!, "gibraltar", "2024-10-29")).toBe("unlabelled");
    expect(expectedLabel(event!, "vega-baja", "2024-10-29")).toBe("unlabelled");
  });

  it("counts a purple/red riuada square as a hit and a yellow one as a miss", () => {
    expect(verdictFor("riuada", 4)).toBe("hit");
    expect(verdictFor("riuada", 3)).toBe("hit");
    expect(verdictFor("riuada", 2)).toBe("miss");
    expect(verdictFor("quiet", 0)).toBe("ok-quiet");
    expect(verdictFor("quiet", 3)).toBe("false-alarm");
    expect(verdictFor("unlabelled", 4 as RiskLevel)).toBe("unlabelled");
  });

  it("summarises only peak-day labelled squares", () => {
    const summary = summarisePeak(
      [
        row({ hotspotId: "valencia-horta", dayLevel: 4, expected: "riuada", verdict: "hit" }),
        row({ hotspotId: "utiel-requena", dayLevel: 1, expected: "riuada", verdict: "miss" }),
        row({
          hotspotId: "valencia-horta",
          date: "2024-10-28",
          dayLevel: 3,
          expected: "unlabelled",
          verdict: "unlabelled",
        }),
      ],
      "2024-10-29",
    );
    expect(summary.hits).toEqual(["valencia-horta"]);
    expect(summary.misses).toEqual(["utiel-requena"]);
    expect(summary.falseAlarms).toEqual([]);
  });

  it("prints hits and misses in the report", () => {
    const rows = [
      row({
        hotspotId: "valencia-horta",
        name: "València / l'Horta",
        dayLevel: 4,
        precipMm: 126,
        maxSetup: 0.7,
        maxImpact: 0.9,
        expected: "riuada",
        verdict: "hit",
      }),
    ];
    const text = formatReport(magre, rows, summarisePeak(rows, magre.peakDate));
    expect(text).toContain("hits:         valencia-horta");
    expect(text).toContain("misses:       —");
  });

  it("rolls labelled days into suite totals", () => {
    const a: BacktestSummary = {
      hits: ["valencia-horta"],
      misses: ["utiel-requena"],
      falseAlarms: [],
      okQuiet: [],
    };
    const b: BacktestSummary = {
      hits: [],
      misses: [],
      falseAlarms: [],
      okQuiet: ["valencia-horta", "utiel-requena", "ribera-jucar"],
    };
    expect(suiteCounts([a, b])).toEqual({
      riuada: 2,
      hits: 1,
      misses: 1,
      quiet: 3,
      okQuiet: 3,
      falseAlarms: 0,
    });
  });
});
