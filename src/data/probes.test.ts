import { describe, expect, it } from "vitest";
import {
  formatMagreObserved,
  MAGRE_CORE_OBSERVED,
  MAGRE_POYO_STAGE,
  MAGRE_SAIH_EPISODE,
  MAGRE_SAIH_RAIN,
} from "@/data/probes";

describe("Magre SAIH episode probes", () => {
  it("keeps AEMET Turís as the core 14 h figure, not SAIH", () => {
    expect(MAGRE_CORE_OBSERVED.source).toBe("aemet");
    expect(MAGRE_CORE_OBSERVED.window.kind).toBe("peak-hours");
    expect(MAGRE_CORE_OBSERVED.window.hours).toBe(14);
    expect(MAGRE_CORE_OBSERVED.window.date).toBe("2024-10-29");
    expect(MAGRE_CORE_OBSERVED.window.comparableToModelDay).toBe(false);
    expect(MAGRE_CORE_OBSERVED.dayMm.from).toBe(700);
    expect(MAGRE_CORE_OBSERVED.dayMm.to).toBe(770);
    expect(MAGRE_CORE_OBSERVED.peakHourMm).toBe(184.6);
  });

  it("carries the 8-day episode window on the table and on every rain row", () => {
    expect(MAGRE_SAIH_EPISODE.window.kind).toBe("episode-sum");
    expect(MAGRE_SAIH_EPISODE.window.days).toBe(8);
    expect(MAGRE_SAIH_EPISODE.window.comparableToModelDay).toBe(false);
    expect(MAGRE_SAIH_RAIN.map((s) => s.id)).toEqual(["chiva", "real", "forata", "requena", "poyo-rain"]);
    expect(MAGRE_SAIH_RAIN.map((s) => s.mm)).toEqual([621, 545.3, 320, 273.4, 240.2]);
    for (const row of MAGRE_SAIH_RAIN) {
      expect(row.window).toBe(MAGRE_SAIH_EPISODE.window);
      expect(row.window.days).toBe(8);
      expect(row.window.kind).toBe("episode-sum");
    }
  });

  it("records Poyo stage as a truncated hydrograph, not rain", () => {
    expect(MAGRE_POYO_STAGE.lostAtLocal).toBe("2024-10-29 18:55");
    expect(MAGRE_POYO_STAGE.lastLevelM).toBe(4.899);
    expect(MAGRE_POYO_STAGE.lastFlowM3s).toBe(2282.9);
    const text = formatMagreObserved();
    expect(text).toContain("621.0");
    expect(text).toContain("545.3");
    expect(text).toContain("320.0");
    expect(text).toContain("273.4");
    expect(text).toContain("240.2");
    expect(text).toContain("not rain");
    expect(text).toContain("18:55");
    expect(text).toContain("sensor lost before the peak");
    expect(text).toContain("Not 29 Oct calendar-day totals");
    expect(text).toContain("8-day episode-sum");
    expect(text).toContain("Do not compare to a single model-run day");
  });
});
