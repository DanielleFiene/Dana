import { describe, expect, it } from "vitest";
import { formatMalagaSaihContrast, type NamedLead } from "@/backtest/leads";

describe("Málaga SAIH lead contrast", () => {
  it("uses Hidrosur rain as the model-day referee and keeps AROME out of domain", () => {
    const rows: NamedLead[] = [
      { place: "Cártama SAIH", model: "desk-mix", analysisMm: 40, lead24Mm: 35, lead48Mm: 20, lead72Mm: 10 },
      { place: "Cártama SAIH", model: "arome_france", analysisMm: null, lead24Mm: null, lead48Mm: null, lead72Mm: null },
      { place: "Málaga square", model: "desk-mix", analysisMm: 45, lead24Mm: 30, lead48Mm: 15, lead72Mm: 8 },
    ];
    const text = formatMalagaSaihContrast(rows);
    expect(text).toContain("First SAIH figure used as a model-day referee");
    expect(text).toContain("Cártama SAIH");
    expect(text).toContain("Málaga square");
    expect(text).toContain("out of domain on this square");
    expect(text).toContain("do not referee millimetres");
    expect(text).toContain("77.3");
    expect(text).toContain("3.08");
    expect(text).toContain("upstream-inflow");
    expect(text).toContain("not grid-undercatch");
    expect(text).toContain("one lead on one cell");
    expect(text).toContain("Valencia / Murcia / Catalonia");
    expect(text).not.toContain("AROME saw it");
  });
});
