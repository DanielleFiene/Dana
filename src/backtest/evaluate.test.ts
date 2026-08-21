import { describe, expect, it } from "vitest";
import { labelledDates, danaEventById, type DanaEvent } from "@/data/events";
import { formatReport, shiftIsoDate, summarisePeak, summariseLabelled, suiteCounts, tallyDeskMechanisms, thinMarginTags, verdictFor, expectedLabel, deskMechanismFor, type PlaceDayRow, type BacktestSummary } from "@/backtest/evaluate";
import { hingeMargin } from "@/backtest/margin";
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
    deskMechanism: null,
    margin: null,
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

  it("tags 4 Nov 2024 Catalonia on the Llobregat / Salou day", () => {
    const event = danaEventById("2024-11-catalunya");
    expect(event).toBeTruthy();
    expect(expectedLabel(event!, "barcelona", "2024-11-04")).toBe("riuada");
    expect(expectedLabel(event!, "tarragona", "2024-11-04")).toBe("riuada");
    expect(expectedLabel(event!, "barcelona", "2024-11-03")).toBe("unlabelled");
    expect(expectedLabel(event!, "valencia-horta", "2024-11-04")).toBe("quiet");
    expect(expectedLabel(event!, "mallorca", "2024-11-04")).toBe("unlabelled");
  });

  it("labels 30 Oct–2 Nov as quiet on the Magre squares", () => {
    const event = danaEventById("2024-10-magre-aftermath");
    expect(event).toBeTruthy();
    expect(labelledDates(event!)).toEqual(["2024-10-30", "2024-10-31", "2024-11-01", "2024-11-02"]);
    expect(expectedLabel(event!, "valencia-horta", "2024-10-31")).toBe("quiet");
    expect(expectedLabel(event!, "valencia-horta", "2024-10-29")).toBe("unlabelled");
    expect(expectedLabel(event!, "barcelona", "2024-10-30")).toBe("unlabelled");
  });

  it("tags 28 Oct 2024 Mallorca on Porto Cristo / Manacor, not Magre squares", () => {
    const event = danaEventById("2024-10-mallorca");
    expect(event).toBeTruthy();
    expect(expectedLabel(event!, "mallorca", "2024-10-28")).toBe("riuada");
    expect(expectedLabel(event!, "pitiusas", "2024-10-28")).toBe("quiet");
    expect(expectedLabel(event!, "mallorca", "2024-10-27")).toBe("unlabelled");
    expect(expectedLabel(event!, "valencia-horta", "2024-10-28")).toBe("unlabelled");
    expect(event!.notes).toContain("does not increment INLAND_AROME_RULE_MIN_CELLS");
  });

  it("tags 11 Nov 2024 Almería ramblas and keeps Magre 29 Oct Mallorca quiet", () => {
    const event = danaEventById("2024-11-almeria");
    expect(event).toBeTruthy();
    expect(expectedLabel(event!, "almeria", "2024-11-11")).toBe("riuada");
    expect(expectedLabel(event!, "almeria", "2024-11-10")).toBe("unlabelled");
    expect(expectedLabel(event!, "malaga", "2024-11-11")).toBe("unlabelled");
    expect(event!.notes).toContain("outside AROME France domain");
    expect(event!.notes).toContain("not inland-orographic");
  });

  it("keeps Murcia Sep 2023 AROME all-null as an archive gap in the event notes", () => {
    const event = danaEventById("2023-09-murcia");
    expect(event?.notes).toContain("archive gap");
    expect(event?.notes).toContain("not the inland/coast hypothesis");
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

  it("tags multi-day quiet labels with date so 30 Oct does not swallow 31 Oct–2 Nov", () => {
    const aftermath = danaEventById("2024-10-magre-aftermath")!;
    const summary = summariseLabelled(
      [
        row({
          hotspotId: "valencia-horta",
          date: "2024-10-30",
          dayLevel: 1,
          expected: "quiet",
          verdict: "ok-quiet",
        }),
        row({
          hotspotId: "valencia-horta",
          date: "2024-10-31",
          dayLevel: 3,
          expected: "quiet",
          verdict: "false-alarm",
        }),
        row({
          hotspotId: "barcelona",
          date: "2024-10-30",
          dayLevel: 3,
          expected: "unlabelled",
          verdict: "unlabelled",
        }),
      ],
      labelledDates(aftermath),
    );
    expect(summary.okQuiet).toEqual(["valencia-horta@2024-10-30"]);
    expect(summary.falseAlarms).toEqual(["valencia-horta@2024-10-31"]);
    expect(summary.hits).toEqual([]);
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
    expect(text).toContain("thin margins: —");
  });

  it("prints the binding hinge and flags a thin hangover before the next binary fail", () => {
    const margin = hingeMargin({
      setup: 0.5,
      impact: 0.54,
      precip24hMm: 8,
      floodProne: true,
      verdict: "false-alarm",
    });
    const rows = [
      row({
        hotspotId: "valencia-horta",
        name: "València / l'Horta",
        date: "2024-11-04",
        dayLevel: 3,
        precipMm: 8,
        maxSetup: 0.5,
        maxImpact: 0.54,
        expected: "quiet",
        verdict: "false-alarm",
        margin,
      }),
    ];
    const catalunya = danaEventById("2024-11-catalunya")!;
    const text = formatReport(catalunya, rows, summarisePeak(rows, catalunya.peakDate));
    expect(text).toContain("bind setup+impact met");
    expect(text).toContain("thin");
    expect(text).toContain("thin margins: valencia-horta@2024-11-04");
    expect(thinMarginTags(catalunya.id, rows)).toEqual(["2024-11-catalunya/valencia-horta@2024-11-04"]);
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

  it("keeps grid-undercatch misses off the hangover pile", () => {
    expect(deskMechanismFor("2024-11-catalunya", "barcelona", "miss")).toBe("grid-undercatch");
    expect(deskMechanismFor("2024-11-catalunya", "tarragona", "miss")).toBe("grid-undercatch");
    expect(deskMechanismFor("2024-11-catalunya", "valencia-horta", "false-alarm")).toBe("hangover");
    expect(deskMechanismFor("2024-11-catalunya", "ribera-jucar", "false-alarm")).toBe("leftover-rain");
    expect(deskMechanismFor("2024-11-catalunya", "barcelona", "false-alarm")).toBe("unassigned");
    expect(deskMechanismFor("2024-10-mallorca", "mallorca", "miss")).toBe("grid-undercatch");
    expect(deskMechanismFor("2024-10-mallorca", "pitiusas", "false-alarm")).toBe("unassigned");
    expect(deskMechanismFor("2024-11-almeria", "almeria", "miss")).toBe("grid-undercatch");
    expect(deskMechanismFor("2024-10-magre-aftermath", "valencia-horta", "false-alarm", "2024-10-30")).toBe(
      "leftover-rain",
    );
    expect(deskMechanismFor("2024-10-magre-aftermath", "valencia-horta", "false-alarm", "2024-11-01")).toBe(
      "hangover",
    );
    expect(deskMechanismFor("2024-10-magre-aftermath", "utiel-requena", "false-alarm", "2024-10-30")).toBe("hangover");
    expect(deskMechanismFor("2024-10-magre-aftermath", "utiel-requena", "false-alarm", "2024-10-31")).toBe(
      "unassigned",
    );
    expect(deskMechanismFor("2024-10-magre-aftermath", "utiel-requena", "false-alarm", "2024-10-31", "arome")).toBe(
      "leftover-rain",
    );

    const catalunya: BacktestSummary = {
      hits: [],
      misses: ["barcelona", "tarragona"],
      falseAlarms: ["valencia-horta", "ribera-jucar"],
      okQuiet: ["utiel-requena"],
    };
    expect(tallyDeskMechanisms("2024-11-catalunya", catalunya)).toEqual({
      gridUndercatchMisses: ["2024-11-catalunya/barcelona", "2024-11-catalunya/tarragona"],
      hangoverFalseAlarms: ["2024-11-catalunya/valencia-horta"],
      leftoverRainFalseAlarms: ["2024-11-catalunya/ribera-jucar"],
      hitDespiteUndercatch: [],
      leadTimeDry: [],
      upstreamInflow: [],
      unassignedMisses: [],
      unassignedFalseAlarms: [],
    });
  });

  it("keeps Cártama off grid-undercatch and records upstream-inflow", () => {
    expect(deskMechanismFor("2024-11-malaga", "malaga", "hit")).toBe("upstream-inflow");
    expect(deskMechanismFor("2024-11-malaga", "malaga", "miss")).toBe("upstream-inflow");
    expect(deskMechanismFor("2024-11-malaga", "malaga", "false-alarm")).toBe("unassigned");
    expect(deskMechanismFor("2024-10-magre", "utiel-requena", "hit")).toBe("grid-undercatch");

    const hit: BacktestSummary = {
      hits: ["malaga"],
      misses: [],
      falseAlarms: [],
      okQuiet: [],
    };
    expect(tallyDeskMechanisms("2024-11-malaga", hit)).toEqual({
      gridUndercatchMisses: [],
      hangoverFalseAlarms: [],
      leftoverRainFalseAlarms: [],
      hitDespiteUndercatch: [],
      leadTimeDry: [],
      upstreamInflow: ["2024-11-malaga/malaga"],
      unassignedMisses: [],
      unassignedFalseAlarms: [],
    });

    const miss: BacktestSummary = {
      hits: [],
      misses: ["malaga"],
      falseAlarms: [],
      okQuiet: [],
    };
    const missTally = tallyDeskMechanisms("2024-11-malaga", miss);
    expect(missTally.upstreamInflow).toEqual(["2024-11-malaga/malaga"]);
    expect(missTally.gridUndercatchMisses).toEqual([]);
    expect(missTally.unassignedMisses).toEqual([]);
  });
});
