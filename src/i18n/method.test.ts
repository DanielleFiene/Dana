import { describe, expect, it } from "vitest";
import { LANGS } from "@/types/lang";
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

  it("recognises the method hash", () => {
    expect(METHOD_HASH).toBe("#method");
    expect(isMethodHash("#method")).toBe(true);
    expect(isMethodHash("#desk")).toBe(false);
    expect(isMethodHash("")).toBe(false);
  });
});
