import type { LngLat } from "@/lib/geo";
import type { SstStationId } from "@/types/place";

export type { SstStationId };

export type Hotspot = {
  id: string;
  name: string;
  floodProne: boolean;
  onshoreFrom: number;
  onshoreTo: number;
  sstStation: SstStationId;
  center: { lat: number; lon: number };
  polygon: LngLat[];
  aemetPath: string;
};

export type SstStation = { id: SstStationId; lat: number; lon: number; name: string };

export const SST_STATIONS: SstStation[] = [
  { id: "golfo-valencia", lat: 39.3, lon: 0.35, name: "Golfo de València" },
  { id: "mar-balear", lat: 39.5, lon: 2.5, name: "Mar Balear" },
  { id: "alboran", lat: 36.5, lon: -3.8, name: "Mar de Alborán" },
  { id: "murcia-mar", lat: 37.55, lon: 0.2, name: "Cabo de Palos" },
  { id: "catalan", lat: 41.05, lon: 2.2, name: "Costa catalana" },
  { id: "cadiz", lat: 36.5, lon: -6.8, name: "Golfo de Cádiz" },
];

function ring(coords: LngLat[]): LngLat[] {
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (!first || !last) return coords;
  if (first[0] === last[0] && first[1] === last[1]) return coords;
  return [...coords, first];
}

export const HOTSPOTS: Hotspot[] = [
  {
    id: "valencia-horta",
    name: "València / l'Horta",
    floodProne: true,
    onshoreFrom: 45,
    onshoreTo: 140,
    sstStation: "golfo-valencia",
    center: { lat: 39.47, lon: -0.38 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-0.65, 39.62],
      [-0.22, 39.62],
      [-0.22, 39.28],
      [-0.65, 39.28],
    ]),
  },
  {
    id: "utiel-requena",
    name: "Utiel–Requena / interior",
    floodProne: true,
    onshoreFrom: 50,
    onshoreTo: 140,
    sstStation: "golfo-valencia",
    center: { lat: 39.48, lon: -1.12 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-1.45, 39.7],
      [-0.72, 39.7],
      [-0.72, 39.28],
      [-1.45, 39.28],
    ]),
  },
  {
    id: "ribera-jucar",
    name: "Ribera del Xúquer",
    floodProne: true,
    onshoreFrom: 45,
    onshoreTo: 140,
    sstStation: "golfo-valencia",
    center: { lat: 39.18, lon: -0.45 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-0.7, 39.28],
      [-0.18, 39.28],
      [-0.18, 38.95],
      [-0.7, 38.95],
    ]),
  },
  {
    id: "castellon",
    name: "Castelló / Plana",
    floodProne: true,
    onshoreFrom: 40,
    onshoreTo: 135,
    sstStation: "golfo-valencia",
    center: { lat: 39.98, lon: -0.05 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-0.35, 40.22],
      [0.22, 40.22],
      [0.22, 39.72],
      [-0.35, 39.72],
    ]),
  },
  {
    id: "alicante",
    name: "Alacant / Marina",
    floodProne: true,
    onshoreFrom: 40,
    onshoreTo: 135,
    sstStation: "murcia-mar",
    center: { lat: 38.35, lon: -0.48 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-0.85, 38.7],
      [-0.05, 38.7],
      [-0.05, 38.05],
      [-0.85, 38.05],
    ]),
  },
  {
    id: "vega-baja",
    name: "Vega Baja / Segura",
    floodProne: true,
    onshoreFrom: 45,
    onshoreTo: 135,
    sstStation: "murcia-mar",
    center: { lat: 38.1, lon: -0.75 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-1.05, 38.28],
      [-0.5, 38.28],
      [-0.5, 37.85],
      [-1.05, 37.85],
    ]),
  },
  {
    id: "murcia",
    name: "Murcia / Guadalentín",
    floodProne: true,
    onshoreFrom: 50,
    onshoreTo: 140,
    sstStation: "murcia-mar",
    center: { lat: 37.99, lon: -1.13 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-1.55, 38.2],
      [-0.85, 38.2],
      [-0.85, 37.55],
      [-1.55, 37.55],
    ]),
  },
  {
    id: "almeria",
    name: "Almería / Levante",
    floodProne: true,
    onshoreFrom: 50,
    onshoreTo: 150,
    sstStation: "alboran",
    center: { lat: 36.84, lon: -2.46 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-2.95, 37.25],
      [-1.7, 37.25],
      [-1.7, 36.68],
      [-2.95, 36.68],
    ]),
  },
  {
    id: "malaga",
    name: "Málaga / Guadalhorce",
    floodProne: true,
    onshoreFrom: 90,
    onshoreTo: 200,
    sstStation: "alboran",
    center: { lat: 36.72, lon: -4.42 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-4.85, 36.95],
      [-3.95, 36.95],
      [-3.95, 36.48],
      [-4.85, 36.48],
    ]),
  },
  {
    id: "gibraltar",
    name: "Campo de Gibraltar / Cádiz este",
    floodProne: true,
    onshoreFrom: 90,
    onshoreTo: 200,
    sstStation: "cadiz",
    center: { lat: 36.15, lon: -5.45 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [-5.85, 36.45],
      [-5.1, 36.45],
      [-5.1, 36.0],
      [-5.85, 36.0],
    ]),
  },
  {
    id: "mallorca",
    name: "Mallorca",
    floodProne: true,
    onshoreFrom: 20,
    onshoreTo: 140,
    sstStation: "mar-balear",
    center: { lat: 39.57, lon: 2.98 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [2.3, 39.95],
      [3.5, 39.95],
      [3.5, 39.2],
      [2.3, 39.2],
    ]),
  },
  {
    id: "pitiusas",
    name: "Eivissa / Formentera",
    floodProne: true,
    onshoreFrom: 30,
    onshoreTo: 140,
    sstStation: "mar-balear",
    center: { lat: 38.91, lon: 1.43 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [1.15, 39.15],
      [1.65, 39.15],
      [1.65, 38.62],
      [1.15, 38.62],
    ]),
  },
  {
    id: "tarragona",
    name: "Tarragona / Ebre",
    floodProne: true,
    onshoreFrom: 40,
    onshoreTo: 130,
    sstStation: "catalan",
    center: { lat: 41.12, lon: 1.14 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [0.5, 41.4],
      [1.5, 41.4],
      [1.5, 40.7],
      [0.5, 40.7],
    ]),
  },
  {
    id: "barcelona",
    name: "Barcelona / Maresme",
    floodProne: true,
    onshoreFrom: 40,
    onshoreTo: 130,
    sstStation: "catalan",
    center: { lat: 41.4, lon: 2.17 },
    aemetPath: "/es/eltiempo/prediccion/avisos",
    polygon: ring([
      [1.7, 41.7],
      [2.85, 41.7],
      [2.85, 41.2],
      [1.7, 41.2],
    ]),
  },
];

export function hotspotById(id: string): Hotspot | undefined {
  return HOTSPOTS.find((h) => h.id === id);
}

export function sstStationById(id: SstStationId): SstStation {
  const s = SST_STATIONS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown SST station ${id}`);
  return s;
}
