/** Peninsular Spain + Balearics + Ceuta/Melilla (not the Canary Islands). */
export const SPAIN_BOUNDS = {
  west: -9.5,
  south: 35.8,
  east: 4.6,
  north: 43.9,
} as const;

export const SPAIN_CENTER: [number, number] = [-3.7, 40.0];
export const VALENCIA_CENTER: [number, number] = [-0.376, 39.47];
export const VALENCIA_ZOOM = 7.15;

export const AEMET_WARNINGS_URL =
  "https://www.aemet.es/es/eltiempo/prediccion/avisos";

export const PROTECCION_CIVIL_URL = "https://www.proteccioncivil.es/";

export function inSpainFocus(lat: number, lon: number): boolean {
  return lat >= SPAIN_BOUNDS.south && lat <= SPAIN_BOUNDS.north && lon >= SPAIN_BOUNDS.west && lon <= SPAIN_BOUNDS.east;
}

/** Andorra sits inside the peninsula bounding box and is not Spain. */
export function inAndorra(lat: number, lon: number): boolean {
  return lat >= 42.42 && lat <= 42.66 && lon >= 1.4 && lon <= 1.79;
}

/** Auto-center / auto-load: Spain product area, not Andorra. */
export function inSpainAutoLocate(lat: number, lon: number): boolean {
  return inSpainFocus(lat, lon) && !inAndorra(lat, lon);
}
