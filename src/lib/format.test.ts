import { describe, expect, it } from "vitest";
import { dayChip, hourAtClock, madridHour, madridYmd, pickStripDate } from "@/lib/format";
import { corridorFill } from "@/map/fill";

describe("madridYmd", () => {
  it("uses Europe/Madrid, not UTC", () => {
    expect(madridYmd(new Date("2026-08-19T10:00:00Z"))).toBe("2026-08-19");
    expect(madridYmd(new Date("2026-08-19T22:30:00Z"))).toBe("2026-08-20");
  });
});

describe("pickStripDate", () => {
  const days = [{ date: "2026-08-19" }, { date: "2026-08-20" }, { date: "2026-08-22" }];

  it("keeps a clicked day", () => {
    expect(pickStripDate(days, "2026-08-22")).toBe("2026-08-22");
  });

  it("defaults to Madrid today when that day is in the list", () => {
    const today = madridYmd();
    expect(pickStripDate([{ date: "2000-01-01" }, { date: today }], null)).toBe(today);
  });

  it("falls back to the first day when today is not in the list", () => {
    expect(pickStripDate([{ date: "2099-01-01" }], null)).toBe("2099-01-01");
  });
});

describe("dayChip", () => {
  it("includes weekday and date", () => {
    expect(dayChip("2026-08-19", "nl")).toMatch(/wo/i);
    expect(dayChip("2026-08-19", "nl")).toMatch(/19/);
  });
});

describe("hourAtClock", () => {
  const hours = [
    { time: "2026-08-22T10:00" },
    { time: "2026-08-22T18:00" },
    { time: "2026-08-22T19:00" },
  ];

  it("picks the Madrid clock hour, not a peak", () => {
    expect(madridHour(new Date("2026-08-19T16:00:00Z"))).toBe(18);
    expect(hourAtClock(hours, new Date("2026-08-19T16:00:00Z"))?.time).toBe("2026-08-22T18:00");
  });
});

describe("corridorFill", () => {
  const days = [
    { date: "2026-08-19", level: 0 },
    { date: "2026-08-22", level: 3 },
  ];

  it("has no fill until scores exist, so the map never flashes fake green", () => {
    expect(corridorFill(undefined, null).ready).toBe(false);
    expect(corridorFill([], "2026-08-22").ready).toBe(false);
  });

  it("starts on the first day when nothing is clicked", () => {
    expect(corridorFill(days, null).level).toBe(0);
  });

  it("follows the clicked strip day", () => {
    expect(corridorFill(days, "2026-08-22").level).toBe(3);
    expect(corridorFill(days, "2026-08-22").color).toBe("#C0392B");
  });

  it("does not paint fake green when the date is missing", () => {
    expect(corridorFill(days, "2099-01-01").level).toBe(0);
  });
});
