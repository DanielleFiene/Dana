import { describe, expect, it } from "vitest";
import { fetchForecasts } from "@/api/openMeteo";
import { fetchMarineAll } from "@/api/marine";
import { searchPlaces } from "@/api/geocoding";
import { loadOnePlace, placeFromHotspot } from "@/api/pipeline";
import { HOTSPOTS } from "@/data/hotspots";
import { RISK_LEVELS } from "@/types/risk";

describe("Open-Meteo live 7-day contract", () => {
  it("returns 168 hourly steps with DANA fields for Valencia", async () => {
    const [forecast] = await fetchForecasts([{ lat: 39.47, lon: -0.38 }]);
    expect(forecast).toBeTruthy();
    const h = forecast!.hourly;
    expect(h.time).toHaveLength(168);
    expect(h.cape).toHaveLength(168);
    expect(h.temperature_500hPa).toHaveLength(168);
    expect(h.geopotential_height_500hPa).toHaveLength(168);
    expect(h.precipitation).toHaveLength(168);
    expect(h.lifted_index).toHaveLength(168);
    expect(h.relative_humidity_850hPa).toHaveLength(168);
    expect(h.total_column_integrated_water_vapour).toHaveLength(168);
    expect(h.wind_speed_850hPa).toHaveLength(168);
    expect(h.cape.some((v) => v !== null)).toBe(true);
    expect(h.temperature_500hPa.every((v) => v === null || (v > -40 && v < 10))).toBe(true);
  });

  it("returns Mediterranean SST", async () => {
    const marine = await fetchMarineAll();
    const val = marine["golfo-valencia"];
    expect(val.hourly.sea_surface_temperature.length).toBeGreaterThanOrEqual(24);
    const sst = val.hourly.sea_surface_temperature.find((v) => v !== null);
    expect(sst).toBeTypeOf("number");
    expect(sst!).toBeGreaterThan(10);
    expect(sst!).toBeLessThan(35);
  });

  it("geocodes a Spanish city", async () => {
    const hits = await searchPlaces("Valencia", "es");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.lat).toBeGreaterThan(38);
    expect(hits[0]?.lon).toBeLessThan(1);
  });

  it("scores a hotspot into a valid 7-day desk", async () => {
    const hotspot = HOTSPOTS[0]!;
    const scored = await loadOnePlace(placeFromHotspot(hotspot));
    expect(scored.days.length).toBeGreaterThanOrEqual(6);
    expect(scored.hours.length).toBe(168);
    expect(scored.week).toBeTruthy();
    expect(RISK_LEVELS.includes(scored.week!.level)).toBe(true);
    expect(scored.days.every((d) => d.date.match(/^\d{4}-\d{2}-\d{2}$/))).toBe(true);
  });
});
