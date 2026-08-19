import { describe, expect, it } from "vitest";
import { runDanaSuite } from "@/backtest/run";

describe("DANA event replay (historical Open-Meteo)", () => {
  it("replays the labelled set without painting dry Magre squares as a flood", async () => {
    const suite = await runDanaSuite();
    console.log(suite.text);

    const magre = suite.reports.find((r) => r.event.id === "2024-10-magre");
    expect(magre).toBeTruthy();
    expect(magre!.summary.hits).toEqual(
      expect.arrayContaining(["valencia-horta", "ribera-jucar", "malaga", "murcia"]),
    );
    expect(magre!.summary.falseAlarms).toEqual([]);
    expect(magre!.summary.okQuiet).toEqual(
      expect.arrayContaining(["mallorca", "pitiusas", "tarragona", "barcelona"]),
    );

    const quiet = suite.reports.find((r) => r.event.id === "2024-08-quiet");
    expect(quiet).toBeTruthy();
    expect(quiet!.summary.falseAlarms).toEqual([]);

    const dryPool = suite.reports.find((r) => r.event.id === "2024-01-dry-pool");
    expect(dryPool).toBeTruthy();
    expect(dryPool!.summary.falseAlarms).toEqual([]);
  });
});
