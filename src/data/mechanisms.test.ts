import { describe, expect, it } from "vitest";
import {
  anatomyFor,
  CATCHMENT_HYPOTHESES,
  DESK_MECHANISMS,
  SQUARE_ANATOMY,
} from "@/data/mechanisms";
import { CARTAMA_SAIH_STAGE } from "@/data/probes";

describe("upstream-inflow desk mechanism", () => {
  it("is a named desk label, not grid-undercatch, and does not move a rain knob", () => {
    expect(Object.keys(DESK_MECHANISMS)).toEqual([
      "grid-undercatch",
      "hangover",
      "leftover-rain",
      "lead-time-dry",
      "upstream-inflow",
    ]);
    expect(DESK_MECHANISMS["upstream-inflow"]).toContain("Not grid-undercatch");
    expect(DESK_MECHANISMS["upstream-inflow"]).toContain("upstream stage/flow");
    expect(DESK_MECHANISMS["upstream-inflow"]).not.toContain("Lowering rain thresholds to chase a miss");

    const row = anatomyFor("2024-11-malaga", "malaga");
    expect(row?.desk).toBe("upstream-inflow");
    expect(row?.when).toBe("upstream-inflow");
    expect(row?.note).toContain("~22 h");
    expect(row?.note).toContain("one lead on one cell");
    expect(row?.note).toContain("never yield an AROME comparison");
    expect(SQUARE_ANATOMY.some((a) => a.eventId === "2024-11-malaga" && a.desk === "grid-undercatch")).toBe(
      false,
    );
    expect(CARTAMA_SAIH_STAGE.lagFromRainPeakHours).toBe(22);
    expect(CATCHMENT_HYPOTHESES.some((h) => h.includes("upstream-inflow"))).toBe(true);
  });
});
