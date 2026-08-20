import { describe, expect, it } from "vitest";
import { runDanaSuite } from "@/backtest/run";
import { countsTowardInlandAromeRule, INLAND_AROME_RULE_MIN_CELLS } from "@/data/hotspots";

describe("DANA event replay (historical Open-Meteo)", () => {
  it("replays the labelled set without painting dry Magre squares as a flood", async () => {
    const suite = await runDanaSuite();
    console.log(suite.text);

    expect(INLAND_AROME_RULE_MIN_CELLS).toBe(6);
    expect(countsTowardInlandAromeRule("mallorca")).toBe(false);
    expect(countsTowardInlandAromeRule("almeria")).toBe(false);

    const mallorca = suite.reports.find((r) => r.event.id === "2024-10-mallorca");
    expect(mallorca).toBeTruthy();
    expect(mallorca!.summary.misses).toEqual(expect.arrayContaining(["mallorca"]));
    expect(mallorca!.summary.falseAlarms).toEqual(expect.arrayContaining(["pitiusas"]));
    expect(suite.text).toContain("Porto Cristo");
    expect(suite.text).toContain(`still 1 of ${INLAND_AROME_RULE_MIN_CELLS}`);
    expect(suite.text).toContain("2024-10-mallorca/mallorca");

    const almeria = suite.reports.find((r) => r.event.id === "2024-11-almeria");
    expect(almeria).toBeTruthy();
    expect(almeria!.summary.misses).toEqual(expect.arrayContaining(["almeria"]));
    const almeriaDelta = suite.aromeDeltas.find(
      (d) => d.eventId === "2024-11-almeria" && d.hotspotId === "almeria",
    );
    expect(almeriaDelta?.kind).toBe("out-of-domain");
    expect(suite.text).toContain("2024-11-almeria/almeria");

    const magre = suite.reports.find((r) => r.event.id === "2024-10-magre");
    expect(magre).toBeTruthy();
    expect(magre!.summary.hits).toEqual(
      expect.arrayContaining(["valencia-horta", "ribera-jucar", "malaga", "murcia"]),
    );
    expect(magre!.summary.falseAlarms).toEqual([]);
    expect(magre!.summary.okQuiet).toEqual(
      expect.arrayContaining(["mallorca", "pitiusas", "tarragona", "barcelona"]),
    );

    const catalunya = suite.reports.find((r) => r.event.id === "2024-11-catalunya");
    expect(catalunya).toBeTruthy();
    expect(catalunya!.summary.misses).toEqual(expect.arrayContaining(["barcelona", "tarragona"]));

    const aftermath = suite.reports.find((r) => r.event.id === "2024-10-magre-aftermath");
    expect(aftermath).toBeTruthy();
    expect(aftermath!.summary.hits).toEqual([]);
    expect(aftermath!.summary.misses).toEqual([]);
    expect(aftermath!.summary.falseAlarms).toEqual(
      expect.arrayContaining([
        "valencia-horta@2024-10-30",
        "valencia-horta@2024-10-31",
        "valencia-horta@2024-11-01",
        "utiel-requena@2024-10-30",
        "ribera-jucar@2024-10-30",
        "ribera-jucar@2024-11-01",
      ]),
    );
    expect(suite.text).toContain("leftover-rain false alarms:");
    expect(suite.text).toContain("2024-10-magre-aftermath/valencia-horta@2024-10-30");
    expect(suite.text).toContain("hangover false alarms:");
    expect(suite.text).toContain("2024-10-magre-aftermath/valencia-horta@2024-11-01");

    const malagaDelta = suite.aromeDeltas.find(
      (d) => d.eventId === "2024-10-magre" && d.hotspotId === "malaga",
    );
    expect(malagaDelta?.kind).toBe("out-of-domain");
    const murcia2023 = suite.aromeDeltas.find(
      (d) => d.eventId === "2023-09-murcia" && d.hotspotId === "murcia",
    );
    expect(murcia2023?.kind).toBe("archive-empty");
    expect(suite.text).toContain("AROME France vs ICON/ECMWF mix");
    expect(suite.text).toContain("Turís");
    expect(suite.text).toContain("700");
    expect(suite.text).toContain("leftover-rain");
    expect(suite.text).toContain("ECMWF IFS ENS");
    expect(suite.text).not.toContain("AROME saw it");
    const utiel31 = suite.aromeDeltas.find(
      (d) => d.eventId === "2024-10-magre-aftermath" && d.hotspotId === "utiel-requena" && d.date === "2024-10-31",
    );
    expect(utiel31?.kind).toBe("new-false-alarm");
    expect(utiel31?.aromeDesk).toBe("leftover-rain");

    const quiet = suite.reports.find((r) => r.event.id === "2024-08-quiet");
    expect(quiet).toBeTruthy();
    expect(quiet!.summary.falseAlarms).toEqual([]);

    const dryPool = suite.reports.find((r) => r.event.id === "2024-01-dry-pool");
    expect(dryPool).toBeTruthy();
    expect(dryPool!.summary.falseAlarms).toEqual([]);
  });
});
