import { ringBounds, type LngLat } from "@/lib/geo";

/** MapLibre world size at zoom 0 (512px tiles). */
const WORLD_Z0 = 512;

/** Keep this much of the map empty on each side so the square is framed, not tight. */
export const SQUARE_SIDE_MARGIN = 0.3;
export const SQUARE_MIN_ZOOM = 6.6;
export const SQUARE_MAX_ZOOM = 8.0;
export const SQUARE_DURATION = 650;

/** Persistent MapLibre padding must stay zero or the square sits low / off-centre. */
export const SQUARE_PADDING = { top: 0, bottom: 0, left: 0, right: 0 } as const;

export type Viewport = { width: number; height: number };
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
 * One camera for a single click and a double click: square in the middle of the map pane.
 * No around-point zoom, no extra bottom padding.
 */
export function squareCamera(ring: ReadonlyArray<LngLat>, view: Viewport): SquareCamera | null {
  const focus = squareFocus(ring);
  const zoom = zoomToFrame(ring, view);
  if (!focus || zoom === null) return null;
  return {
    center: focus.center,
    zoom,
    duration: SQUARE_DURATION,
    essential: true,
    offset: [0, 0],
  };
}

/** Pixel position of a lng/lat under a camera with zero padding (tests: centre of the square). */
export function projectOnCamera(
  lng: number,
  lat: number,
  camera: { center: readonly [number, number]; zoom: number },
  view: Viewport,
): { x: number; y: number } {
  const { width, height } = finiteViewport(view);
  const world = WORLD_Z0 * 2 ** camera.zoom;
  const xOf = (lon: number) => ((lon + 180) / 360) * world;
  const yOf = (la: number) => mercatorY(la) * world;
  return {
    x: width / 2 + (xOf(lng) - xOf(camera.center[0])),
    y: height / 2 + (yOf(lat) - yOf(camera.center[1])),
  };
}

/** GPS / search: put that point in the middle of the map, not the surrounding square. */
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
