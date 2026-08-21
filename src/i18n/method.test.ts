import { describe, expect, it } from "vitest";
import { LANGS } from "@/types/lang";
import { labelledSuiteUpdatedOn } from "@/data/events";
import { isMethodHash, METHOD_HASH, METHOD_SECTION_IDS, methodCopy } from "@/i18n/method";

describe("method copy", () => {
  it("has every language and every section filled", () => {
    for (const lang of LANGS) {
      const t = methodCopy[lang];
      expect(t.nav.trim()).not.toBe("");
      expect(t.title.trim()).not.toBe("");
      expect(t.back.trim()).not.toBe("");
      expect(t.lead.trim()).not.toBe("");
      for (const id of METHOD_SECTION_IDS) {
        const section = t.sections[id];
        expect(section.heading.trim()).not.toBe("");
        expect(section.body.length).toBeGreaterThan(0);
        for (const para of section.body) {
          expect(para.trim()).not.toBe("");
        }
      }
    }
  });

  it("does not sell a chance figure as something the tool does", () => {
    const banned = /\b\d+\s*%/g;
    for (const lang of LANGS) {
      const blob = JSON.stringify(methodCopy[lang]);
      expect(blob.match(banned)).toBeNull();
    }
  });

  it("names live models, keeps AROME off the live mix, and states known limits", () => {
    for (const lang of LANGS) {
      const blob = JSON.stringify(methodCopy[lang]);
      expect(blob).toContain("ICON");
      expect(blob).toContain("ECMWF");
      expect(blob).toContain("AROME");
      expect(blob).toContain("AEMET");
      expect(blob).toContain("Open-Meteo");
      expect(blob).toContain("SAIH");
      expect(blob).toContain("Utiel");
      expect(methodCopy[lang].nav.toLowerCase()).toMatch(/l[ií]mit|grenzen|beperk|omezen/);
    }
    expect(methodCopy.nl.sections.tested.body.join(" ")).toContain(
      "Dat record is geen claim dat de kaart compleet is",
    );
    expect(methodCopy.en.sections.what.body[0]).toContain(
      "the model also actually forecasts rain, not only the right atmospheric conditions",
    );
  });

  it("pins the Murcia 2023 gap on AROME’s Open-Meteo channel, not the whole archive", () => {
    for (const lang of LANGS) {
      const tested = methodCopy[lang].sections.tested.body.join(" ");
      expect(tested).toMatch(/2023/);
      expect(tested).toMatch(/AROME/);
      expect(tested).toMatch(/ICON/);
      expect(tested).toMatch(/ECMWF/);
      expect(tested).toMatch(/Open-Meteo/);
    }
    expect(methodCopy.nl.sections.tested.body.join(" ")).toContain(
      "een gat specifiek in het AROME-archief binnen Open-Meteo",
    );
    expect(methodCopy.en.sections.tested.body.join(" ")).toContain(
      "a gap specifically in AROME’s archive on Open-Meteo",
    );
  });

  it("keeps backtest taxonomy labels out of the public method text", () => {
    const banned = [
      "hangover",
      "leftover-rain",
      "flood-gate",
      "Flood-Gate",
      "grid-undercatch",
      "upstream-inflow",
      "Inland-AROME",
      "all-null",
      "compuerta",
    ];
    for (const lang of LANGS) {
      const blob = JSON.stringify(methodCopy[lang]);
      for (const term of banned) {
        expect(blob).not.toContain(term);
      }
    }
  });

  it("recognises the method hash", () => {
    expect(METHOD_HASH).toBe("#method");
    expect(isMethodHash("#method")).toBe(true);
    expect(isMethodHash("#desk")).toBe(false);
    expect(isMethodHash("")).toBe(false);
  });

  it("ends the tested section with the labelled-suite date from events.ts", () => {
    const iso = labelledSuiteUpdatedOn();
    expect(iso).toBe("2026-08-20");
    for (const lang of LANGS) {
      const last = methodCopy[lang].sections.tested.body.at(-1) ?? "";
      expect(last).toMatch(/2026/);
      expect(last.toLowerCase()).toMatch(/actualitz|actualiz|updated|aktualisiert|bijgewerkt|aktualizov/);
    }
    expect(methodCopy.nl.sections.tested.body.at(-1)).toMatch(/^Laatst bijgewerkt:/);
    expect(methodCopy.en.sections.tested.body.at(-1)).toMatch(/^Last updated:/);
  });
});
