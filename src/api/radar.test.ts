import { describe, expect, it } from "vitest";
import { RADAR_MAX_ZOOM, radarTileUrl } from "@/api/radar";

describe("radar tiles", () => {
  it("stays at RainViewer free zoom 7 so the map does not show zoom-not-supported", () => {
    expect(RADAR_MAX_ZOOM).toBe(7);
    const url = radarTileUrl("https://tilecache.rainviewer.com", "/v2/radar/1700000000");
    expect(url).toContain("/256/{z}/{x}/{y}/2/0_0.png");
    expect(url).not.toMatch(/\/4\/1_1/);
  });
});
