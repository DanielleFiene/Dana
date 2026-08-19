import { describe, expect, it } from "vitest";
import { bearingInRange, pointInRing, ringBounds } from "@/lib/geo";
import { inAndorra, inSpainAutoLocate } from "@/lib/spain";
import { sanitizePlaceName, sanitizeSearchQuery } from "@/lib/security";
import { isLang, LANGUAGES } from "@/types/lang";
import { copy } from "@/i18n/copy";
import { HOTSPOTS } from "@/data/hotspots";

describe("pointInRing", () => {
  const square = [
    [-1, 39] as const,
    [0, 39] as const,
    [0, 40] as const,
    [-1, 40] as const,
    [-1, 39] as const,
  ];
  it("detects inside / outside", () => {
    expect(pointInRing(-0.5, 39.5, square)).toBe(true);
    expect(pointInRing(1, 39.5, square)).toBe(false);
  });
  it("computes southwest / northeast corners", () => {
    expect(ringBounds(square)).toEqual([
      [-1, 39],
      [0, 40],
    ]);
  });
});

describe("bearing wrap", () => {
  it("handles ranges that cross north", () => {
    expect(bearingInRange(10, 350, 20)).toBe(true);
    expect(bearingInRange(180, 350, 20)).toBe(false);
    expect(bearingInRange(90, 45, 135)).toBe(true);
  });
});

describe("sanitize", () => {
  it("strips markup and caps length", () => {
    expect(sanitizePlaceName("<script>x</script> Granja")).toBe("scriptx/script Granja");
    expect(sanitizeSearchQuery("  Valencia  ").length).toBeGreaterThan(0);
    expect(sanitizePlaceName("a".repeat(80)).length).toBe(48);
  });
});

describe("Spain auto-locate", () => {
  it("treats Andorra as outside auto-center, Valencia as inside", () => {
    expect(inAndorra(42.51, 1.52)).toBe(true);
    expect(inSpainAutoLocate(42.51, 1.52)).toBe(false);
    expect(inSpainAutoLocate(39.47, -0.38)).toBe(true);
  });
});

describe("languages", () => {
  it("includes Czech in the switcher and copy", () => {
    expect(isLang("cs")).toBe(true);
    expect(LANGUAGES.some((l) => l.id === "cs")).toBe(true);
    expect(copy.cs.patternNotRain.length).toBeGreaterThan(8);
    expect(copy.nl.search.toLowerCase()).not.toMatch(/hoeve|finca|farm/);
    expect(copy.nl.levels[3].name.toLowerCase()).toBe("zware buien");
    expect(copy.nl.levels[4].name.toLowerCase()).toBe("overstromingsrisico");
    expect(copy.nl.mapHint.toLowerCase()).toMatch(/gouden rand/);
    expect(copy.nl.mapHint.toLowerCase()).not.toMatch(/rood|paars/);
    expect(copy.nl.disclaimer).toContain("{n}");
    expect(copy.nl.disclaimer.toLowerCase()).toMatch(/niet-commercieel/);
    expect(copy.nl.disclaimer.toLowerCase()).not.toMatch(/112|volg aemet|geldt dat/);
    expect(copy.nl.indicatorHelp.lifted.toLowerCase()).not.toMatch(/geen overstroming/);
    expect(copy.nl.levels[1].hint.toLowerCase()).not.toMatch(/geen overstroming/);
    expect(copy.nl.levels[3].hint.toLowerCase()).not.toMatch(/reizen|aemet/);
    expect(HOTSPOTS).toHaveLength(14);
    for (const lang of LANGUAGES) {
      expect(copy[lang.id].disclaimer).toContain("{n}");
    }
  });
});
