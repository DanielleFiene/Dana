import { describe, expect, it } from "vitest";
import {
  CARTAMA_SAIH_FLOW,
  CARTAMA_SAIH_RAIN,
  CARTAMA_SAIH_STAGE,
  FAROLA_SAIH_RAIN,
  ALMERIA_SAIH_RAIN,
  GADOR_SAIH_RAIN,
  formatAlmeriaObserved,
  formatCartamaObserved,
  formatFarolaObserved,
  formatMagreObserved,
  MAGRE_CORE_OBSERVED,
  MAGRE_POYO_FLOW_AT_LOSS,
  MAGRE_POYO_STAGE,
  MAGRE_SAIH_EPISODE,
  MAGRE_SAIH_RAIN,
  POYO_N3_CAUDAL,
} from "@/data/probes";
import { WANTED_FLOW } from "@/saih/chj/catalog";

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
      expect(row.quantity).toBe("rain");
    }
  });

  it("records Poyo stage as nivel only, and keeps caudal on a different label", () => {
    expect(MAGRE_POYO_STAGE.id).toBe("poyo-stage");
    expect(MAGRE_POYO_STAGE.quantity).toBe("stage");
    expect(MAGRE_POYO_STAGE.unit).toBe("m");
    expect(MAGRE_POYO_STAGE.lastLevelM).toBe(4.899);
    expect(MAGRE_POYO_STAGE.publicSeries).toBe(false);
    expect("lastFlowM3s" in MAGRE_POYO_STAGE).toBe(false);

    expect(MAGRE_POYO_FLOW_AT_LOSS.id).toBe("poyo-flow-at-loss");
    expect(MAGRE_POYO_FLOW_AT_LOSS.quantity).toBe("flow");
    expect(MAGRE_POYO_FLOW_AT_LOSS.unit).toBe("m³/s");
    expect(MAGRE_POYO_FLOW_AT_LOSS.lastFlowM3s).toBe(2282.9);
    expect(MAGRE_POYO_FLOW_AT_LOSS.lostAtLocal).toBe(MAGRE_POYO_STAGE.lostAtLocal);
    expect(MAGRE_POYO_FLOW_AT_LOSS.sameInstantAs).toBe(MAGRE_POYO_STAGE.id);
    expect(MAGRE_POYO_FLOW_AT_LOSS.id).not.toBe(MAGRE_POYO_STAGE.id);

    expect(POYO_N3_CAUDAL.id).toBe("poyo-flow");
    expect(POYO_N3_CAUDAL.quantity).toBe("flow");
    expect(POYO_N3_CAUDAL.variableId).toBe("13873");
    expect(POYO_N3_CAUDAL.publicSeries).toBe(true);
    expect(POYO_N3_CAUDAL.id).not.toBe(MAGRE_POYO_STAGE.id);
    expect(POYO_N3_CAUDAL.quantity).not.toBe(MAGRE_POYO_STAGE.quantity);

    expect(WANTED_FLOW[0]?.id).toBe(POYO_N3_CAUDAL.id);
    expect(WANTED_FLOW[0]?.quantity).toBe(POYO_N3_CAUDAL.quantity);
    expect(WANTED_FLOW[0]?.fallbackVariableId).toBe(POYO_N3_CAUDAL.variableId);

    const text = formatMagreObserved();
    expect(text).toContain("621.0");
    expect(text).toContain("545.3");
    expect(text).toContain("320.0");
    expect(text).toContain("273.4");
    expect(text).toContain("240.2");
    expect(text).toContain("nivel, not rain, not caudal");
    expect(text).toContain("18:55");
    expect(text).toContain("sensor lost before the peak");
    expect(text).toContain("No public CHJ nivel series");
    expect(text).toContain("not live variable 13873");
    expect(text).toContain("2282.9");
    expect(text).toContain("Not 29 Oct calendar-day totals");
    expect(text).toContain("8-day episode-sum");
    expect(text).toContain("Do not compare to a single model-run day");
  });
});

describe("Cártama Hidrosur probes", () => {
  it("keeps rain, stage and flow on three labels, and 13 Nov rain as a model-day referee", () => {
    expect(CARTAMA_SAIH_RAIN.quantity).toBe("rain");
    expect(CARTAMA_SAIH_RAIN.window.comparableToModelDay).toBe(true);
    expect(CARTAMA_SAIH_RAIN.episode.comparableToModelDay).toBe(false);
    expect(CARTAMA_SAIH_RAIN.dayMm).toBe(77.3);
    expect(CARTAMA_SAIH_RAIN.peakHourMm).toBe(19.2);
    expect(CARTAMA_SAIH_RAIN.episode.mm).toBe(84.5);

    expect(CARTAMA_SAIH_STAGE.id).toBe("cartama-stage");
    expect(CARTAMA_SAIH_STAGE.quantity).toBe("stage");
    expect(CARTAMA_SAIH_STAGE.publicSeries).toBe(true);
    expect(CARTAMA_SAIH_STAGE.peakM).toBe(3.08);
    expect(CARTAMA_SAIH_STAGE.peakAtLocal).toBe("2024-11-14 10:00");
    expect(CARTAMA_SAIH_RAIN.peakHourAtLocal).toBe("2024-11-13 12:00");
    expect(CARTAMA_SAIH_STAGE.lagFromRainPeakHours).toBe(22);
    expect("peakM3s" in CARTAMA_SAIH_STAGE).toBe(false);
    expect(CARTAMA_SAIH_STAGE.id).not.toBe(MAGRE_POYO_STAGE.id);

    expect(CARTAMA_SAIH_FLOW.quantity).toBe("flow");
    expect(CARTAMA_SAIH_FLOW.sameCsvAs).toBe(CARTAMA_SAIH_STAGE.id);
    expect(CARTAMA_SAIH_FLOW.id).not.toBe(CARTAMA_SAIH_STAGE.id);
    expect(CARTAMA_SAIH_FLOW.peakAtLocal).toBe(CARTAMA_SAIH_STAGE.peakAtLocal);

    const text = formatCartamaObserved();
    expect(text).toContain("comparable to a model calendar day");
    expect(text).toContain("038P01");
    expect(text).toContain("038R03");
    expect(text).toContain("Poyo has none");
    expect(text).toContain("not cartama-stage");
    expect(text).toContain("Not CHG");
    expect(text).toContain("22 h later");
    expect(text).toContain("not a routing rule");
  });
});

describe("Farola Hidrosur probe", () => {
  it("keeps city-core rain on its own label, same 24 h order as Cártama", () => {
    expect(FAROLA_SAIH_RAIN.id).toBe("farola-rain");
    expect(FAROLA_SAIH_RAIN.quantity).toBe("rain");
    expect(FAROLA_SAIH_RAIN.code).toBe("022P01");
    expect(FAROLA_SAIH_RAIN.window.comparableToModelDay).toBe(true);
    expect(FAROLA_SAIH_RAIN.episode.comparableToModelDay).toBe(false);
    expect(FAROLA_SAIH_RAIN.dayMm).toBe(81.3);
    expect(FAROLA_SAIH_RAIN.peakHourMm).toBe(49.3);
    expect(FAROLA_SAIH_RAIN.peakHourAtLocal).toBe("2024-11-13 14:00");
    expect(FAROLA_SAIH_RAIN.episode.mm).toBe(100.9);
    expect(FAROLA_SAIH_RAIN.id).not.toBe(CARTAMA_SAIH_RAIN.id);
    expect(FAROLA_SAIH_RAIN.dayMm).toBeGreaterThan(70);
    expect(FAROLA_SAIH_RAIN.dayMm).toBeLessThan(120);

    const text = formatFarolaObserved();
    expect(text).toContain("022P01");
    expect(text).toContain("not Cártama");
    expect(text).toContain("comparable to a model calendar day");
    expect(text).toContain("does not reclassify");
    expect(text).toContain("Do not mix with Cártama 038R03");
    expect(text).toContain("Does not increment inland-orographic");
  });
});

describe("Almería Hidrosur probes", () => {
  it("records city and Gádor as dry on the labelled 11 Nov day", () => {
    expect(ALMERIA_SAIH_RAIN.code).toBe("089P01");
    expect(GADOR_SAIH_RAIN.code).toBe("076P01");
    expect(ALMERIA_SAIH_RAIN.dayMm).toBe(0);
    expect(GADOR_SAIH_RAIN.dayMm).toBe(0);
    expect(ALMERIA_SAIH_RAIN.window.comparableToModelDay).toBe(true);
    expect(GADOR_SAIH_RAIN.episode.mm).toBe(4.1);
    expect(GADOR_SAIH_RAIN.peakHourMm).toBe(1.7);
    expect(GADOR_SAIH_RAIN.peakHourAtLocal).toBe("2024-11-13 13:00");
    expect(ALMERIA_SAIH_RAIN.id).not.toBe(GADOR_SAIH_RAIN.id);

    const text = formatAlmeriaObserved();
    expect(text).toContain("089P01");
    expect(text).toContain("076P01");
    expect(text).toContain("not Poniente");
    expect(text).toContain("comparable to a model calendar day");
    expect(text).toContain("Does not increment inland-orographic");
  });
});
