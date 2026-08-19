import type { RiskLevel } from "@/types/risk";

export type FactorKey =
  | "rain"
  | "setup"
  | "instability"
  | "persistence"
  | "moisture"
  | "moisture850"
  | "pwat"
  | "sst"
  | "coldCore"
  | "geopotential"
  | "onshore"
  | "cape"
  | "gradient"
  | "lifted"
  | "cin"
  | "soil";

export const FACTOR_ORDER: readonly FactorKey[] = [
  "rain",
  "setup",
  "instability",
  "moisture",
  "moisture850",
  "pwat",
  "sst",
  "coldCore",
  "geopotential",
  "onshore",
  "cape",
  "gradient",
  "lifted",
  "cin",
  "persistence",
  "soil",
];

export type HourSample = {
  time: string;
  temperature2m: number | null;
  dewPoint2m: number | null;
  relativeHumidity2m: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  cape: number | null;
  liftedIndex: number | null;
  convectiveInhibition: number | null;
  temperature850: number | null;
  relativeHumidity850: number | null;
  dewPoint850: number | null;
  temperature500: number | null;
  geopotential500: number | null;
  windSpeed10m: number | null;
  windDirection10m: number | null;
  windGusts10m: number | null;
  windSpeed850: number | null;
  windDirection850: number | null;
  windSpeed700: number | null;
  soilMoisture: number | null;
  weatherCode: number | null;
  sst: number | null;
  /** kg/m² ≈ mm of precipitable water (Open-Meteo column vapour). */
  pwat: number | null;
};

export type ScoreContext = {
  floodProne: boolean;
  onshoreFrom: number | null;
  onshoreTo: number | null;
  precip24hMm: number | null;
  precip48hMm?: number | null;
  persistWetHours: number | null;
};

export type HourScore = {
  time: string;
  level: RiskLevel;
  rain: number;
  setup: number;
  instability: number;
  impact: number;
  /** Extra riada chip: dangerous rain is actually on the ground, not just a hot/cold sky. */
  floodGate: boolean;
  factors: Partial<Record<FactorKey, number>>;
  thermalGradientC: number | null;
  precip24hMm: number | null;
  precipHourMm: number | null;
  cape: number | null;
  sst: number | null;
  temperature2m: number | null;
  temperature500: number | null;
  gustKmh: number | null;
  liftedIndex: number | null;
  relativeHumidity850: number | null;
};

export type DayScore = {
  date: string;
  level: RiskLevel;
  precipMm: number;
  maxGust: number | null;
  peak: HourScore;
  hours: HourScore[];
};

export type Coord = {
  lat: number;
  lon: number;
};
