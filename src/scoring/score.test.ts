import { describe, expect, it } from "vitest";
import { pickColder, pickLowerHeight } from "@/api/pipeline";
import { capeScore, coldCoreScore, geopotentialScore, pwatScore, thermalGradientScore } from "@/scoring/factors";
import { isDryWindow } from "@/scoring/actions";
import { classifyLevel, dayWatchLevel, scoreHour, scoreSeries } from "@/scoring/score";
import type { HourSample } from "@/types/weather";

function sample(over: Partial<HourSample> = {}): HourSample {
  return {
    time: "2026-10-29T18:00",
    temperature2m: 22,
    dewPoint2m: 20,
    relativeHumidity2m: 75,
    precipitation: 0,
    precipitationProbability: 40,
    cape: 900,
    liftedIndex: -2,
    convectiveInhibition: 20,
    temperature850: 16,
    relativeHumidity850: 80,
    dewPoint850: 12,
    temperature500: -17,
    geopotential500: 5540,
    windSpeed10m: 28,
    windDirection10m: 90,
    windGusts10m: 45,
    windSpeed850: 32,
    windDirection850: 90,
    windSpeed700: 22,
    soilMoisture: 0.28,
    weatherCode: 0,
    sst: 27.5,
    pwat: 34,
    ...over,
  };
}

describe("lapse-rate screen", () => {
  it("treats the 38 °C / −16 °C example as an extreme shock (~54 °C)", () => {
    const delta = 38 - -16;
    expect(delta).toBe(54);
    expect(thermalGradientScore(54)).toBeGreaterThanOrEqual(0.9);
    expect(thermalGradientScore(36)).toBeLessThan(0.15);
  });

  it("scores a −17 °C 500 hPa pool as a real cold core", () => {
    expect(coldCoreScore(-17)).toBeGreaterThan(0.6);
    expect(geopotentialScore(5540)).toBeGreaterThan(0.85);
    expect(geopotentialScore(5900)).toBeLessThan(0.1);
  });
});

describe("classifyLevel — DANA is not a CAPE toy", () => {
  it("does not call a hot dry Andalusian day a flash flood", () => {
    const hour = scoreHour(
      sample({
        temperature2m: 38,
        temperature500: -16,
        cape: 2800,
        dewPoint2m: 10,
        relativeHumidity850: 20,
        precipitation: 1,
        precipitationProbability: 20,
        sst: 23,
        pwat: 16,
        geopotential500: 5780,
        windDirection10m: 270,
        windDirection850: 270,
        windSpeed850: 12,
        windSpeed700: 40,
        liftedIndex: -5,
      }),
      { floodProne: false, onshoreFrom: 45, onshoreTo: 135, precip24hMm: 2, persistWetHours: 0 },
    );
    expect(hour.thermalGradientC).toBe(54);
    expect(capeScore(2800)).toBeGreaterThan(0.8);
    expect(hour.floodGate).toBe(false);
    expect(hour.level).toBeLessThanOrEqual(1);
  });

  it("raises classic DANA when the cut-off + Med moisture are there, even before the dump", () => {
    const hour = scoreHour(sample({ precipitation: 2 }), {
      floodProne: true,
      onshoreFrom: 45,
      onshoreTo: 135,
      precip24hMm: 8,
      persistWetHours: 1,
    });
    expect(hour.floodGate).toBe(false);
    expect(hour.level).toBe(2);
    expect(hour.setup).toBeGreaterThan(0.48);
  });

  it("flags a Valencia-style training rain as catastrophic on a flood-prone hotspot", () => {
    const hour = scoreHour(sample({ precipitation: 28, precipitationProbability: 85, cape: 900, weatherCode: 95 }), {
      floodProne: true,
      onshoreFrom: 45,
      onshoreTo: 135,
      precip24hMm: 95,
      persistWetHours: 6,
    });
    expect(hour.floodGate).toBe(true);
    expect(hour.level).toBe(4);
  });

  it("needs real rain for catastrophic, not CAPE alone", () => {
    expect(classifyLevel(0.7, 0.2, 0.95)).toBe(2);
    expect(classifyLevel(0.3, 0.92, 0.2)).toBe(4);
    expect(
      classifyLevel(0.55, 0.25, 0.4, { floodProne: true, precip24hMm: 50, precip48hMm: 55 }),
    ).toBe(4);
    expect(
      classifyLevel(0.55, 0.25, 0.4, { floodProne: true, precip24hMm: 25, precip48hMm: 30 }),
    ).toBe(3);
    expect(
      classifyLevel(0.55, 0.25, 0.4, { floodProne: false, precip24hMm: 50, precip48hMm: 55 }),
    ).toBe(2);
  });

  it("does not tell people to stay home when the model is dry", () => {
    const hour = scoreHour(sample({ precipitation: 0 }), {
      floodProne: true,
      onshoreFrom: 45,
      onshoreTo: 135,
      precip24hMm: 0,
      persistWetHours: 0,
    });
    expect(isDryWindow(hour)).toBe(true);
    expect(hour.level).toBeGreaterThanOrEqual(1);
  });

  it("treats model 50 mm on a DANA rambla as extreme — models under-do Med convection", () => {
    const hour = scoreHour(sample({ precipitation: 6, precipitationProbability: 70 }), {
      floodProne: true,
      onshoreFrom: 45,
      onshoreTo: 135,
      precip24hMm: 50,
      precip48hMm: 62,
      persistWetHours: 3,
    });
    expect(hour.level).toBe(4);
    expect(hour.floodGate).toBe(true);
  });

  it("treats a stalling DANA with 50 mm in 48 h as severe on a flood corridor", () => {
    const hour = scoreHour(sample({ precipitation: 1.2 }), {
      floodProne: true,
      onshoreFrom: 45,
      onshoreTo: 135,
      precip24hMm: 18,
      precip48hMm: 50,
      persistWetHours: 4,
    });
    expect(hour.level).toBeGreaterThanOrEqual(3);
    expect(isDryWindow(hour)).toBe(false);
  });
});

describe("scoreSeries", () => {
  it("rolls 24 h rainfall and persistence", () => {
    const hours: HourSample[] = Array.from({ length: 30 }, (_, i) =>
      sample({
        time: `2026-10-29T${String(i % 24).padStart(2, "0")}:00`,
        precipitation: i >= 20 ? 8 : 0,
        temperature2m: 21,
      }),
    );
    const scored = scoreSeries(hours, true, 45, 135);
    const last = scored[scored.length - 1];
    expect(last?.precip24hMm).toBe(80);
    expect(last?.level).toBeGreaterThanOrEqual(3);
  });
});

describe("column water and dual-model cut-off", () => {
  it("scores Mediterranean PWAT in the flood-fuel range", () => {
    expect(pwatScore(22)).toBe(0);
    expect(pwatScore(35)).toBeGreaterThanOrEqual(0.7);
    expect(pwatScore(42)).toBe(1);
  });

  it("keeps the colder 500 hPa pool if either ICON or ECMWF sees it", () => {
    expect(pickColder(-11.4, -17)).toBe(-17);
    expect(pickLowerHeight(5817, 5540)).toBe(5540);
    expect(pickColder(-12, null)).toBe(-12);
  });
});

describe("dayWatchLevel", () => {
  it("stays green when most hours are green and one hour is yellow", () => {
    const hours = [...Array.from({ length: 20 }, () => ({ level: 0 })), { level: 1 }, { level: 1 }];
    expect(dayWatchLevel(hours)).toBe(0);
  });

  it("goes yellow when a quarter of the day is unsettled", () => {
    const hours = [...Array.from({ length: 18 }, () => ({ level: 0 })), ...Array.from({ length: 6 }, () => ({ level: 1 }))];
    expect(dayWatchLevel(hours)).toBe(1);
  });

  it("goes red or purple from a single threatening hour", () => {
    const hours = [...Array.from({ length: 23 }, () => ({ level: 0 })), { level: 3 }];
    expect(dayWatchLevel(hours)).toBe(3);
    expect(dayWatchLevel([...hours.slice(0, 23), { level: 4 }])).toBe(4);
  });

  it("paints orange only when rain is actually on, not a dry cold pool", () => {
    expect(dayWatchLevel([...Array.from({ length: 21 }, () => ({ level: 0 })), { level: 2 }, { level: 2 }, { level: 2 }])).toBe(0);
    expect(dayWatchLevel([...Array.from({ length: 23 }, () => ({ level: 0 })), { level: 2, floodGate: true }])).toBe(2);
    expect(dayWatchLevel([...Array.from({ length: 23 }, () => ({ level: 0 })), { level: 2, precip24hMm: 12 }])).toBe(2);
  });
});

