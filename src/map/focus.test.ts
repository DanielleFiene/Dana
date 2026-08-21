import { describe, expect, it } from "vitest";
import {
  SQUARE_MAX_ZOOM,
  SQUARE_MIN_ZOOM,
  cameraPadding,
  mergeInsets,
  overlayInset,
  pinCamera,
  pinOffset,
  projectOnCamera,
  squareCamera,
  squareFocus,
  visibleView,
  ZERO_INSET,
} from "@/map/focus";

const valencia = [
  [-0.65, 39.62] as const,
  [-0.22, 39.62] as const,
  [-0.22, 39.28] as const,
  [-0.65, 39.28] as const,
  [-0.65, 39.62] as const,
];

const cityPin = { lon: -0.38, lat: 39.47 };
const view = { width: 800, height: 560 };

describe("squareFocus", () => {
  it("puts the camera on the middle of the square, not a corner or city pin", () => {
    const focus = squareFocus(valencia);
    expect(focus).not.toBeNull();
    expect(focus?.center[0]).toBeCloseTo(-0.435, 5);
    expect(focus?.center[1]).toBeGreaterThan(39.28);
    expect(focus?.center[1]).toBeLessThan(39.62);
    expect(focus?.center[0]).not.toBeCloseTo(cityPin.lon, 2);
    expect(focus?.bounds).toEqual([
      [-0.65, 39.28],
      [-0.22, 39.62],
    ]);
  });
});

describe("squareCamera", () => {
  it("is the same for a single click and a double click", () => {
    const once = squareCamera(valencia, view);
    const twice = squareCamera(valencia, view);
    expect(once).toEqual(twice);
    expect(once?.offset).toEqual([0, 0]);
    expect(once?.zoom).toBeGreaterThanOrEqual(SQUARE_MIN_ZOOM);
    expect(once?.zoom).toBeLessThanOrEqual(SQUARE_MAX_ZOOM);
  });

  it("pulls back from a tight zoom so neighbouring squares stay in view", () => {
    expect(SQUARE_MAX_ZOOM).toBeLessThanOrEqual(8);
    const cam = squareCamera(valencia, view);
    expect(cam?.zoom).toBeLessThanOrEqual(8);
  });

  it("places that square in the middle of the map pane", () => {
    const cam = squareCamera(valencia, view);
    expect(cam).not.toBeNull();
    if (!cam) return;
    const mid = projectOnCamera(cam.center[0], cam.center[1], cam, view);
    expect(mid.x).toBeCloseTo(view.width / 2, 5);
    expect(mid.y).toBeCloseTo(view.height / 2, 5);

    const west = projectOnCamera(-0.65, 39.45, cam, view);
    const east = projectOnCamera(-0.22, 39.45, cam, view);
    const south = projectOnCamera(-0.435, 39.28, cam, view);
    const north = projectOnCamera(-0.435, 39.62, cam, view);
    expect(west.x).toBeCloseTo(view.width - east.x, 5);
    expect(north.y).toBeCloseTo(view.height - south.y, 5);
    expect(west.x).toBeGreaterThan(80);
    expect(east.x).toBeLessThan(view.width - 80);
    expect(north.y).toBeGreaterThan(40);
    expect(south.y).toBeLessThan(view.height - 40);
  });

  it("frames the square in the remaining map beside a left info desk", () => {
    const overlay = { ...ZERO_INSET, left: 412 };
    const wide = { width: 1200, height: 800 };
    const cam = squareCamera(valencia, wide, overlay);
    expect(cam).not.toBeNull();
    if (!cam) return;
    expect(cam.offset).toEqual([0, 0]);
    const mid = projectOnCamera(cam.center[0], cam.center[1], cam, wide, overlay);
    expect(mid.x).toBeCloseTo((wide.width + overlay.left) / 2, 5);
    expect(mid.y).toBeCloseTo(wide.height / 2, 5);
  });

  it("does not zoom around a click point (that is what made double-click feel different)", () => {
    const cam = squareCamera(valencia, view);
    expect(cam).not.toBeNull();
    expect("around" in (cam ?? {})).toBe(false);
  });
});

describe("pinCamera", () => {
  it("puts GPS on that point; map padding is what avoids the desk", () => {
    const cam = pinCamera(4.9, 52.37);
    expect(cam.center).toEqual([4.9, 52.37]);
    expect(cam.offset).toEqual([0, 0]);
    expect(cam.zoom).toBeGreaterThan(7);
  });
});

describe("cameraPadding", () => {
  it("shifts the visual centre right of a left info desk", () => {
    const overlay = { ...ZERO_INSET, left: 412 };
    const wide = { width: 1200, height: 800 };
    const pad = cameraPadding(wide, overlay);
    expect(pad.left).toBe(412);
    const at = projectOnCamera(4.9, 52.37, { center: [4.9, 52.37], zoom: 7.6 }, wide, overlay);
    expect(at.x).toBeCloseTo((wide.width + overlay.left) / 2, 5);
    expect(at.y).toBeCloseTo(wide.height / 2, 5);
  });

  it("shifts the visual centre up from a bottom sheet", () => {
    const overlay = { ...ZERO_INSET, bottom: 400 };
    const phone = { width: 390, height: 844 };
    const at = projectOnCamera(-0.38, 39.47, { center: [-0.38, 39.47], zoom: 7.6 }, phone, overlay);
    expect(at.x).toBeCloseTo(phone.width / 2, 5);
    expect(at.y).toBeCloseTo((phone.height - overlay.bottom) / 2, 5);
  });

  it("shrinks the frame used for corridor zoom", () => {
    const overlay = { ...ZERO_INSET, left: 400 };
    const wide = { width: 1200, height: 800 };
    expect(visibleView(wide, overlay)).toEqual({ width: 800, height: 800 });
  });
});

describe("overlayInset", () => {
  it("treats the desktop desk as left padding, not as part of the centre", () => {
    const map = { left: 0, top: 0, right: 1400, bottom: 900 };
    const desk = { left: 12, top: 72, right: 412, bottom: 876 };
    expect(overlayInset(map, desk)).toEqual({ ...ZERO_INSET, left: 412 });
  });

  it("treats an overlapping bottom sheet as bottom padding", () => {
    const map = { left: 0, top: 0, right: 390, bottom: 844 };
    const sheet = { left: 0, top: 440, right: 390, bottom: 844 };
    expect(overlayInset(map, sheet)).toEqual({ ...ZERO_INSET, bottom: 404 });
  });

  it("ignores a desk that sits below the map pane", () => {
    const map = { left: 0, top: 0, right: 390, bottom: 440 };
    const desk = { left: 0, top: 440, right: 390, bottom: 844 };
    expect(overlayInset(map, desk)).toEqual(ZERO_INSET);
  });

  it("treats a top chrome strip as top padding", () => {
    const map = { left: 0, top: 0, right: 390, bottom: 440 };
    const top = { left: 0, top: 0, right: 390, bottom: 88 };
    expect(overlayInset(map, top)).toEqual({ ...ZERO_INSET, top: 88 });
  });
});

describe("pinOffset", () => {
  it("is zero when the desk is already out of the map", () => {
    expect(pinOffset({ width: 390, height: 440 }, ZERO_INSET)).toEqual([0, 0]);
  });
});

describe("mergeInsets", () => {
  it("keeps the left desk and a top strip together", () => {
    expect(mergeInsets({ ...ZERO_INSET, left: 412 }, { ...ZERO_INSET, top: 72 })).toEqual({
      top: 72,
      bottom: 0,
      left: 412,
      right: 0,
    });
  });
});
