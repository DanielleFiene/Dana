import { describe, expect, it } from "vitest";
import { SQUARE_MAX_ZOOM, SQUARE_MIN_ZOOM, SQUARE_PADDING, pinCamera, projectOnCamera, squareCamera, squareFocus } from "@/map/focus";

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

  it("clears MapLibre padding so the square is not shifted down", () => {
    expect(SQUARE_PADDING.top).toBe(0);
    expect(SQUARE_PADDING.bottom).toBe(SQUARE_PADDING.top);
    expect(SQUARE_PADDING.left).toBe(SQUARE_PADDING.right);
    expect(SQUARE_PADDING.left).toBe(SQUARE_PADDING.top);
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

  it("does not zoom around a click point (that is what made double-click feel different)", () => {
    const cam = squareCamera(valencia, view);
    expect(cam).not.toBeNull();
    expect("around" in (cam ?? {})).toBe(false);
  });
});

describe("pinCamera", () => {
  it("puts GPS in the middle of the map, not a corridor square", () => {
    const cam = pinCamera(4.9, 52.37);
    expect(cam.center).toEqual([4.9, 52.37]);
    expect(cam.offset).toEqual([0, 0]);
    expect(cam.zoom).toBeGreaterThan(7);
  });
});
