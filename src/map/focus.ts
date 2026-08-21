import { ringBounds, type LngLat } from "@/lib/geo";

/** MapLibre world size at zoom 0 (512px tiles). */
const WORLD_Z0 = 512;

/** Keep this much of the map empty on each side so the square is framed, not tight. */
export const SQUARE_SIDE_MARGIN = 0.3;
export const SQUARE_MIN_ZOOM = 6.6;
export const SQUARE_MAX_ZOOM = 8.0;
export const SQUARE_DURATION = 650;

export type Viewport = { width: number; height: number };
export type OverlayInset = { top: number; bottom: number; left: number; right: number };
export type OverlayRect = { left: number; top: number; right: number; bottom: number };
export const ZERO_INSET: OverlayInset = { top: 0, bottom: 0, left: 0, right: 0 };
/** Keep this much map free after an overlay inset so the pin has somewhere to sit. */
const MIN_VISIBLE = 96;

export type SquareCamera = {
  center: [number, number];
  zoom: number;
  duration: number;
  essential: true;
  offset: [0, 0];
};

export type SquareFocus = {
  bounds: [[number, number], [number, number]];
  center: [number, number];
};

/** Web Mercator Y in 0..1 (north = 0). */
export function mercatorY(lat: number): number {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
}

export function latFromMercatorY(y: number): number {
  const n = Math.PI * (1 - 2 * y);
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

function finiteViewport(view: Viewport): Viewport {
  const width = view.width > 1 ? view.width : 800;
  const height = view.height > 1 ? view.height : 560;
  return { width, height };
}

/** Frame a corridor: mercator midpoint of the box, not a city pin that can sit off-centre. */
export function squareFocus(ring: ReadonlyArray<LngLat>): SquareFocus | null {
  const bounds = ringBounds(ring);
  if (!bounds) return null;
  const sw = bounds[0];
  const ne = bounds[1];
  const west = sw[0];
  const south = sw[1];
  const east = ne[0];
  const north = ne[1];
  return {
    bounds,
    center: [(west + east) / 2, latFromMercatorY((mercatorY(south) + mercatorY(north)) / 2)],
  };
}

export function zoomToFrame(ring: ReadonlyArray<LngLat>, view: Viewport): number | null {
  const bounds = ringBounds(ring);
  if (!bounds) return null;
  const sw = bounds[0];
  const ne = bounds[1];
  const west = sw[0];
  const south = sw[1];
  const east = ne[0];
  const north = ne[1];
  const { width, height } = finiteViewport(view);
  const dx = (Math.abs(east - west) / 360) * WORLD_Z0;
  const dy = Math.abs(mercatorY(south) - mercatorY(north)) * WORLD_Z0;
  if (dx < 1e-9 || dy < 1e-9) return SQUARE_MIN_ZOOM;
  const innerW = width * (1 - 2 * SQUARE_SIDE_MARGIN);
  const innerH = height * (1 - 2 * SQUARE_SIDE_MARGIN);
  const zoom = Math.log2(Math.min(innerW / dx, innerH / dy));
  return Math.min(SQUARE_MAX_ZOOM, Math.max(SQUARE_MIN_ZOOM, zoom));
}

/**
 * MapLibre padding for the hole the chrome does not cover.
 * Camera centre, attribution and later pans all use this rectangle.
 */
export function cameraPadding(view: Viewport, overlay: OverlayInset): OverlayInset {
  const { width, height } = finiteViewport(view);
  const left = Math.min(Math.max(0, overlay.left), Math.max(0, width - MIN_VISIBLE));
  const right = Math.min(Math.max(0, overlay.right), Math.max(0, width - MIN_VISIBLE - left));
  const top = Math.min(Math.max(0, overlay.top), Math.max(0, height - MIN_VISIBLE));
  const bottom = Math.min(Math.max(0, overlay.bottom), Math.max(0, height - MIN_VISIBLE - top));
  return { top, right, bottom, left };
}

export function visibleView(view: Viewport, overlay: OverlayInset = ZERO_INSET): Viewport {
  const pad = cameraPadding(view, overlay);
  const { width, height } = finiteViewport(view);
  return {
    width: Math.max(MIN_VISIBLE, width - pad.left - pad.right),
    height: Math.max(MIN_VISIBLE, height - pad.top - pad.bottom),
  };
}

/**
 * One camera for a single click and a double click: square in the visible map,
 * not under the info desk. Zoom is framed in the remaining pane. Offset stays
 * zero — MapLibre padding is what shifts the vanishing point.
 */
export function squareCamera(
  ring: ReadonlyArray<LngLat>,
  view: Viewport,
  overlay: OverlayInset = ZERO_INSET,
): SquareCamera | null {
  const focus = squareFocus(ring);
  const zoom = zoomToFrame(ring, visibleView(view, overlay));
  if (!focus || zoom === null) return null;
  return {
    center: focus.center,
    zoom,
    duration: SQUARE_DURATION,
    essential: true,
    offset: [0, 0],
  };
}

/** Pixel position of a lng/lat. Overlay padding moves the visual centre. */
export function projectOnCamera(
  lng: number,
  lat: number,
  camera: { center: readonly [number, number]; zoom: number; offset?: readonly [number, number] },
  view: Viewport,
  overlay: OverlayInset = ZERO_INSET,
): { x: number; y: number } {
  const pad = cameraPadding(view, overlay);
  const vis = visibleView(view, overlay);
  const world = WORLD_Z0 * 2 ** camera.zoom;
  const xOf = (lon: number) => ((lon + 180) / 360) * world;
  const yOf = (la: number) => mercatorY(la) * world;
  const ox = camera.offset?.[0] ?? 0;
  const oy = camera.offset?.[1] ?? 0;
  return {
    x: pad.left + vis.width / 2 + ox + (xOf(lng) - xOf(camera.center[0])),
    y: pad.top + vis.height / 2 + oy + (yOf(lat) - yOf(camera.center[1])),
  };
}

function intersectRect(a: OverlayRect, b: OverlayRect): OverlayRect | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right - left <= 1 || bottom - top <= 1) return null;
  return { left, top, right, bottom };
}

/**
 * How much of the map pane is covered by the info desk, as edge padding.
 * Picks the one-sided inset that leaves the largest remaining rectangle —
 * left card on desktop, bottom sheet when that sheet actually overlaps the map.
 * No overlap → zeros: a desk below the map (phone column) is already out of the pane.
 */
export function overlayInset(map: OverlayRect, overlay: OverlayRect): OverlayInset {
  const hit = intersectRect(map, overlay);
  if (!hit) return { ...ZERO_INSET };
  const mapW = Math.max(1, map.right - map.left);
  const mapH = Math.max(1, map.bottom - map.top);
  const fromLeft = hit.right - map.left;
  const fromRight = map.right - hit.left;
  const fromTop = hit.bottom - map.top;
  const fromBottom = map.bottom - hit.top;
  const options: Array<{ inset: OverlayInset; area: number }> = [
    { inset: { ...ZERO_INSET, left: fromLeft }, area: Math.max(0, mapW - fromLeft) * mapH },
    { inset: { ...ZERO_INSET, right: fromRight }, area: Math.max(0, mapW - fromRight) * mapH },
    { inset: { ...ZERO_INSET, top: fromTop }, area: mapW * Math.max(0, mapH - fromTop) },
    { inset: { ...ZERO_INSET, bottom: fromBottom }, area: mapW * Math.max(0, mapH - fromBottom) },
  ];
  const best = options.reduce((a, b) => (a.area >= b.area ? a : b));
  return best.area <= 0 ? { ...ZERO_INSET } : best.inset;
}

export function mergeInsets(a: OverlayInset, b: OverlayInset): OverlayInset {
  return {
    top: Math.max(a.top, b.top),
    bottom: Math.max(a.bottom, b.bottom),
    left: Math.max(a.left, b.left),
    right: Math.max(a.right, b.right),
  };
}

/** Pixel offset equivalent of camera padding (tests: pin in the remaining hole). */
export function pinOffset(view: Viewport, overlay: OverlayInset): [number, number] {
  const pad = cameraPadding(view, overlay);
  return [(pad.left - pad.right) / 2, (pad.top - pad.bottom) / 2];
}

/** GPS / search: that point. Padding on the map puts it in the visible hole. */
export const PIN_ZOOM = 7.6;

export function pinCamera(lng: number, lat: number) {
  return {
    center: [lng, lat] as [number, number],
    zoom: PIN_ZOOM,
    duration: SQUARE_DURATION,
    essential: true as const,
    offset: [0, 0] as [0, 0],
  };
}
