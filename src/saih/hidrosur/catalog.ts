/**
 * SAIH Hidrosur (Junta de Andalucía). Not CHG — Guadalquivir is Atlantic.
 * Covers Málaga / Almería / Campo de Gibraltar (Cuencas Mediterráneas Andaluzas).
 *
 * Undocumented CodeIgniter portal. Same risk class as CHJ: a redesign
 * can break the CSV path. Fail loudly (session vs empty vs HTML vs 404).
 *
 * 038P01 (Cártama pluvio), 038R03 (nivel CSV, which also carries a caudal
 * column) and 022P01 (Farola pluvio) are the harvest targets for the
 * labelled 13 Nov 2024 window. Farola is the Málaga city-core millimetre
 * check; Cártama is the Guadalhorce catchment. Other IDs below were seen
 * on the form and are not fetched. 038R03 nivel and 038R03 caudal are
 * different quantities.
 */

export const HIDROSUR_ORIGIN = "https://www.redhidrosurmedioambiente.es";
export const HIDROSUR_TZ = "Europe/Madrid";
export const DEFAULT_TIMEOUT_MS = 25_000;

/** Hourly grouping — the form default, and what returned Nov 2024 Cártama. */
export const AGRUPACION_HOURLY = "60";

export const CARTAMA_STAGE = {
  id: "cartama-stage",
  stationId: "38",
  sensorId: "038R03",
  stationName: "RÍO GUADALHORCE (CÁRTAMA) (MA)",
  quantity: "stage",
  unit: "m",
  kind: "stage-hourly",
  agrupacion: AGRUPACION_HOURLY,
  csvColumn: "Nivel (m.)",
} as const;

/** Same 038R03 CSV as stage, caudal column — not a stage series. */
export const CARTAMA_FLOW = {
  id: "cartama-flow",
  stationId: "38",
  sensorId: "038R03",
  stationName: "RÍO GUADALHORCE (CÁRTAMA) (MA)",
  quantity: "flow",
  unit: "m³/s",
  kind: "flow-hourly",
  agrupacion: AGRUPACION_HOURLY,
  csvColumn: "Caudal (m3/s)",
} as const;

export const CARTAMA_RAIN = {
  id: "cartama-rain",
  stationId: "38",
  sensorId: "038P01",
  stationName: "RÍO GUADALHORCE (CÁRTAMA) (MA)",
  quantity: "rain",
  unit: "mm",
  kind: "rain-hourly",
  agrupacion: AGRUPACION_HOURLY,
} as const;

/** Málaga port / city core — the desk-square centre, not the Guadalhorce gauge. */
export const FAROLA_RAIN = {
  id: "farola-rain",
  stationId: "22",
  sensorId: "022P01",
  stationName: "MÁLAGA - PASEO DE LA FAROLA (MA)",
  quantity: "rain",
  unit: "mm",
  kind: "rain-hourly",
  agrupacion: AGRUPACION_HOURLY,
} as const;

/** Inclusive Europe/Madrid wall times around the labelled 13 Nov 2024 MCS. */
export const MALAGA_2024_WINDOW = {
  fromLocal: "11/11/2024 00:00",
  toLocal: "15/11/2024 23:59",
  peakDate: "2024-11-13",
  eventId: "2024-11-malaga",
} as const;

export type ConfirmedSensor = {
  stationId: string;
  name: string;
  province: "MA" | "AL" | "CA";
  sensorId: string;
  sensorName: string;
  letter: string;
};

/**
 * Corridor-relevant sensors read from the 177-station form.
 * Confirmed, not fetched — do not treat as a harvest list.
 */
export const CONFIRMED_ON_FORM: readonly ConfirmedSensor[] = [
  { stationId: "38", name: "RÍO GUADALHORCE (CÁRTAMA) (MA)", province: "MA", sensorId: "038P01", sensorName: "PLUVIÓMETRO", letter: "P" },
  { stationId: "38", name: "RÍO GUADALHORCE (CÁRTAMA) (MA)", province: "MA", sensorId: "038R03", sensorName: "NIVEL OJO DCHO", letter: "R" },
  { stationId: "22", name: "MÁLAGA - PASEO DE LA FAROLA (MA)", province: "MA", sensorId: "022P01", sensorName: "PLUVIÓMETRO", letter: "P" },
  { stationId: "46", name: "RÍO GUADALHORCE (ALJAIMA) (MA)", province: "MA", sensorId: "046P01", sensorName: "PLUVIÓMETRO", letter: "P" },
  { stationId: "46", name: "RÍO GUADALHORCE (ALJAIMA) (MA)", province: "MA", sensorId: "046R01", sensorName: "NIVEL RÍO", letter: "R" },
  { stationId: "89", name: "ALMERÍA (AL)", province: "AL", sensorId: "089P01", sensorName: "PLUVIÓMETRO", letter: "P" },
  { stationId: "76", name: "SIERRA DE GÁDOR (AL)", province: "AL", sensorId: "076P01", sensorName: "PLUVIÓMETRO", letter: "P" },
  { stationId: "11", name: "RÍO GUADIARO(S PABLO BUCEITE) (CA)", province: "CA", sensorId: "011P01", sensorName: "PLUVIÓMETRO", letter: "P" },
  { stationId: "8", name: "EMBALSE DE GUADARRANQUE (CA)", province: "CA", sensorId: "008P01", sensorName: "PLUVIÓMETRO", letter: "P" },
  { stationId: "3", name: "EMBALSE DE CHARCO REDONDO (CA)", province: "CA", sensorId: "003P01", sensorName: "PLUVIÓMETRO", letter: "P" },
];
