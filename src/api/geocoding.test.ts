import { describe, expect, it } from "vitest";
import { preferSpanishHits } from "@/api/geocoding";

describe("preferSpanishHits", () => {
  it("puts mainland Spain and Spanish islands ahead of abroad", () => {
    const ranked = preferSpanishHits([
      { name: "Paris", countryCode: "FR" },
      { name: "Valencia", countryCode: "ES" },
      { name: "Oslo", countryCode: "NO" },
      { name: "Palma", countryCode: "ES" },
      { name: "Las Palmas", countryCode: "ES" },
    ]);
    expect(ranked.map((h) => h.name)).toEqual(["Valencia", "Palma", "Las Palmas", "Paris", "Oslo"]);
  });

  it("does not boost Portugal or southern France just because they sit in the map box", () => {
    const ranked = preferSpanishHits([
      { name: "Paris", countryCode: "FR" },
      { name: "Lisbon", countryCode: "PT" },
      { name: "Perpignan", countryCode: "FR" },
      { name: "Madrid", countryCode: "ES" },
    ]);
    expect(ranked.map((h) => h.name)).toEqual(["Madrid", "Paris", "Lisbon", "Perpignan"]);
  });
});
