import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent, type RasterTileSource } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { RADAR_MAX_ZOOM, fetchRadarTileTemplates } from "@/api/radar";
import { HOTSPOTS } from "@/data/hotspots";
import { VALENCIA_CENTER, VALENCIA_ZOOM } from "@/lib/spain";
import type { ScoredPlace } from "@/api/pipeline";
import { corridorFill } from "@/map/fill";
import { cameraPadding, mergeInsets, overlayInset, pinCamera, squareCamera, ZERO_INSET } from "@/map/focus";

setWorkerUrl(mapWorkerUrl);

type Props = {
  desk: ScoredPlace[];
  selectedId: string | null;
  selectedDate: string | null;
  pinLat: number | null;
  pinLon: number | null;
  followPin: boolean;
  focusMode: "square" | "pin";
  focusTick: number;
  radarOn: boolean;
  labels: { radar: string; radarHint: string; day: string };
  onRadar: (on: boolean) => void;
  onSelect: (hotspotId: string) => void;
};

function geojson(desk: ScoredPlace[], selectedId: string | null, selectedDate: string | null): FeatureCollection {
  const byId = new Map(desk.map((d) => [d.place.id, d]));
  return {
    type: "FeatureCollection",
    features: HOTSPOTS.map((h) => {
      const scored = byId.get(h.id);
      const fill = corridorFill(scored?.days, selectedDate);
      return {
        type: "Feature" as const,
        id: h.id,
        properties: {
          id: h.id,
          name: h.name,
          color: fill.color,
          selected: selectedId === h.id ? "yes" : "no",
          ready: fill.ready ? "yes" : "no",
        },
        geometry: { type: "Polygon" as const, coordinates: [h.polygon.map(([lng, lat]) => [lng, lat])] },
      };
    }),
  };
}

function chromeOverlay(mapEl: HTMLElement) {
  const map = mapEl.getBoundingClientRect();
  let inset = { ...ZERO_INSET };
  for (const el of document.querySelectorAll("[data-map-overlay]")) {
    if (!(el instanceof HTMLElement)) continue;
    inset = mergeInsets(inset, overlayInset(map, el.getBoundingClientRect()));
  }
  return inset;
}

function applyChrome(map: MapLibreMap, syncCamera: boolean) {
  const box = map.getContainer();
  const view = { width: box.clientWidth, height: box.clientHeight };
  const inset = cameraPadding(view, chromeOverlay(box));
  const app = box.closest(".app");
  if (app instanceof HTMLElement) {
    app.style.setProperty("--overlay-top", `${String(Math.round(inset.top))}px`);
    app.style.setProperty("--overlay-right", `${String(Math.round(inset.right))}px`);
    app.style.setProperty("--overlay-bottom", `${String(Math.round(inset.bottom))}px`);
    app.style.setProperty("--overlay-left", `${String(Math.round(inset.left))}px`);
  }
  if (syncCamera) map.setPadding(inset);
  return { view, inset };
}

function flyToPad(
  map: MapLibreMap,
  cam: { center: [number, number]; zoom: number; duration: number; essential: true; offset: readonly [number, number] },
  inset: ReturnType<typeof applyChrome>["inset"],
  flying: { current: boolean },
  flyGen: { current: number },
) {
  flying.current = true;
  const gen = ++flyGen.current;
  map.stop();
  map.flyTo({ ...cam, offset: [cam.offset[0], cam.offset[1]], padding: inset });
  map.once("moveend", () => {
    if (flyGen.current === gen) flying.current = false;
  });
}

export function MapView({
  desk,
  selectedId,
  selectedDate,
  pinLat,
  pinLon,
  followPin,
  focusMode,
  focusTick,
  radarOn,
  labels,
  onRadar,
  onSelect,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const deskRef = useRef(desk);
  const selectedRef = useRef(selectedId);
  const dateRef = useRef(selectedDate);
  const radarTimer = useRef<number | null>(null);
  const framedByClick = useRef(false);
  const flying = useRef(false);
  const flyGen = useRef(0);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    deskRef.current = desk;
    selectedRef.current = selectedId;
    dateRef.current = selectedDate;
  }, [desk, selectedId, selectedDate]);

  useEffect(() => {
    if (!wrap.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: wrap.current,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap © CARTO",
          },
          radar: {
            type: "raster",
            tiles: ["https://tilecache.rainviewer.com/v2/radar/0/256/{z}/{x}/{y}/2/0_0.png"],
            tileSize: 256,
            maxzoom: RADAR_MAX_ZOOM,
            attribution: "Radar © RainViewer",
          },
          hotspots: { type: "geojson", data: geojson([], null, null) },
        },
        layers: [
          { id: "carto", type: "raster", source: "carto" },
          {
            id: "radar",
            type: "raster",
            source: "radar",
            layout: { visibility: "none" },
            paint: { "raster-opacity": 0.62, "raster-fade-duration": 0 },
          },
          {
            id: "hot-fill",
            type: "fill",
            source: "hotspots",
            paint: {
              "fill-color": ["get", "color"],
              "fill-opacity": ["match", ["get", "ready"], "yes", 0.45, 0.12],
            },
          },
          {
            id: "hot-line",
            type: "line",
            source: "hotspots",
            paint: {
              "line-color": [
                "case",
                ["==", ["get", "selected"], "yes"],
                "#d7c48a",
                ["==", ["get", "ready"], "yes"],
                ["get", "color"],
                "#6a7b70",
              ],
              "line-width": ["match", ["get", "selected"], "yes", 2.8, 1.15],
              "line-opacity": 1,
            },
          },
        ],
      },
      center: VALENCIA_CENTER,
      zoom: VALENCIA_ZOOM,
      maxZoom: 11,
      minZoom: 4.4,
      dragRotate: false,
      pitchWithRotate: false,
      doubleClickZoom: false,
      boxZoom: false,
    });
    const paint = () => {
      const src = map.getSource("hotspots") as GeoJSONSource | undefined;
      src?.setData(geojson(deskRef.current, selectedRef.current, dateRef.current));
    };
    const lockZoomClick = () => {
      map.doubleClickZoom.disable();
    };
    map.on("load", () => {
      paint();
      lockZoomClick();
      applyChrome(map, true);
    });
    const frameSquare = (id: string) => {
      const hotspot = HOTSPOTS.find((h) => h.id === id);
      if (!hotspot) return;
      map.doubleClickZoom.disable();
      const { view, inset } = applyChrome(map, false);
      const fly = squareCamera(hotspot.polygon, view, inset);
      if (fly) flyToPad(map, fly, inset, flying, flyGen);
    };
    const pick = (e: MapLayerMouseEvent) => {
      e.preventDefault();
      lockZoomClick();
      const hits = map.queryRenderedFeatures(e.point, { layers: ["hot-fill", "hot-line"] });
      const id = hits[0]?.properties?.id;
      if (typeof id !== "string") return;
      framedByClick.current = true;
      frameSquare(id);
      onSelectRef.current(id);
    };
    map.on("click", pick);
    map.on("dblclick", pick);
    map.on("mouseenter", "hot-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseenter", "hot-line", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "hot-fill", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseleave", "hot-line", () => {
      map.getCanvas().style.cursor = "";
    });
    mapRef.current = map;
    const applyLayout = () => {
      map.resize();
      applyChrome(map, !flying.current && !map.isMoving());
    };
    const ro = new ResizeObserver(applyLayout);
    ro.observe(map.getContainer());
    for (const el of document.querySelectorAll("[data-map-overlay]")) {
      ro.observe(el);
    }
    window.addEventListener("resize", applyLayout);
    return () => {
      window.removeEventListener("resize", applyLayout);
      ro.disconnect();
      if (radarTimer.current !== null) window.clearInterval(radarTimer.current);
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("hotspots") as GeoJSONSource | undefined;
      src?.setData(geojson(desk, selectedId, selectedDate));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [desk, selectedId, selectedDate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.remove();
    markerRef.current = null;
    if (pinLat === null || pinLon === null) return;
    markerRef.current = new Marker({ color: "#d7c48a" }).setLngLat([pinLon, pinLat]).addTo(map);
    if (!followPin) return;
    if (framedByClick.current) {
      framedByClick.current = false;
      return;
    }
    const hotspot = selectedId ? HOTSPOTS.find((h) => h.id === selectedId) : undefined;
    const frame = () => {
      map.doubleClickZoom.disable();
      const { view, inset } = applyChrome(map, false);
      const square =
        focusMode === "square" && hotspot
          ? squareCamera(hotspot.polygon, view, inset)
          : null;
      flyToPad(map, square ?? pinCamera(pinLon, pinLat), inset, flying, flyGen);
    };
    const start = () => {
      requestAnimationFrame(() => {
        if (map.isStyleLoaded()) frame();
        else map.once("load", frame);
      });
    };
    if (map.isStyleLoaded()) start();
    else map.once("load", start);
  }, [pinLat, pinLon, followPin, selectedId, focusTick, focusMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (radarTimer.current !== null) {
      window.clearInterval(radarTimer.current);
      radarTimer.current = null;
    }
    const show = (on: boolean) => {
      if (map.getLayer("radar")) {
        map.setLayoutProperty("radar", "visibility", on ? "visible" : "none");
      }
    };
    if (!radarOn) {
      if (map.isStyleLoaded()) show(false);
      else map.once("load", () => show(false));
      return;
    }
    let cancelled = false;
    void fetchRadarTileTemplates()
      .then((frames) => {
        if (cancelled || frames.length === 0) return;
        let i = 0;
        const applyFrame = () => {
          const src = map.getSource("radar") as RasterTileSource | undefined;
          const tile = frames[i];
          if (src && tile) src.setTiles([tile]);
          i = (i + 1) % frames.length;
        };
        applyFrame();
        show(true);
        radarTimer.current = window.setInterval(applyFrame, 520);
      })
      .catch(() => {
        /* radar is optional */
      });
    return () => {
      cancelled = true;
      if (radarTimer.current !== null) {
        window.clearInterval(radarTimer.current);
        radarTimer.current = null;
      }
      show(false);
    };
  }, [radarOn]);

  return (
    <div className="map-wrap" ref={wrap} role="presentation">
      <div className="map-tools">
        {labels.day ? <span className="map-tool day-tag">{labels.day}</span> : null}
        <button
          type="button"
          className={radarOn ? "map-tool on" : "map-tool"}
          title={labels.radarHint}
          aria-pressed={radarOn}
          onClick={() => onRadar(!radarOn)}
        >
          {labels.radar}
        </button>
      </div>
    </div>
  );
}

export default MapView;
