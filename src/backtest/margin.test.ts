import { describe, expect, it } from "vitest";
import { hingeMargin } from "@/backtest/margin";

describe("hinge margins", () => {
  it("treats Utiel 42 mm vs 22 mm as a comfortable upscale hit, even if impact-0.64 is tight", () => {
    const m = hingeMargin({
      setup: 0.54,
      impact: 0.67,
      precip24hMm: 42,
      floodProne: true,
      verdict: "hit",
    });
    expect(m.binding?.path).toBe("upscale");
    expect(m.binding?.signedRelative).toBeGreaterThan(0.8);
    expect(m.thin).toBe(false);
    expect(m.thinParts.some((p) => p.name === "impact" && p.threshold === 0.64)).toBe(true);
  });

  it("flags the Catalonia hangover as a thin setup+impact false alarm", () => {
    const m = hingeMargin({
      setup: 0.5,
      impact: 0.54,
      precip24hMm: 8,
      floodProne: true,
      verdict: "false-alarm",
    });
    expect(m.binding?.path).toBe("setup+impact");
    expect(m.binding?.met).toBe(true);
    expect(Math.abs(m.binding!.signedRelative)).toBeLessThan(0.12);
    expect(m.thin).toBe(true);
    const upscale = m.paths.find((p) => p.path === "upscale");
    expect(upscale?.met).toBe(false);
  });

  it("shows a Catalonia-style miss sitting short of 22 mm with combo unmet", () => {
    const m = hingeMargin({
      setup: 0.54,
      impact: 0.32,
      precip24hMm: 17,
      floodProne: true,
      verdict: "miss",
    });
    expect(m.binding?.met).toBe(false);
    const upscale = m.paths.find((p) => p.path === "upscale");
    expect(upscale?.met).toBe(false);
    expect(upscale?.parts.some((p) => p.name === "precip24h" && p.value === 17)).toBe(true);
  });

  it("binds leftover Magre rain on the 48 h limb when the calendar day is already dry", () => {
    const m = hingeMargin({
      setup: 0.53,
      impact: 0.35,
      precip24hMm: 12,
      precip48hMm: 90,
      floodProne: true,
      verdict: "false-alarm",
    });
    expect(m.binding?.path).toBe("upscale");
    expect(m.binding?.met).toBe(true);
    expect(m.thin).toBe(false);
  });

  it("flags the 31 Oct Utiel AROME false alarm as 48 h leftover, not 0.48+0.38", () => {
    const m = hingeMargin({
      setup: 0.48,
      impact: 0.28,
      precip24hMm: 0,
      precip48hMm: 217,
      floodProne: true,
      verdict: "false-alarm",
    });
    expect(m.binding?.path).toBe("upscale");
    expect(m.binding?.met).toBe(true);
    expect(m.paths.find((p) => p.path === "setup+impact")?.met).toBe(false);
  });
});
