import type { DayScore, HourScore } from "@/types/weather";

export type SstStationId =
  | "golfo-valencia"
  | "mar-balear"
  | "alboran"
  | "murcia-mar"
  | "catalan"
  | "cadiz";

export type PlaceKey = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  hotspotId: string | null;
  sstStation: SstStationId;
  floodProne: boolean;
  onshoreFrom: number | null;
  onshoreTo: number | null;
};

export type SavedPlace = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export type PlaceHit = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
};

export type ScoredPlace = {
  place: PlaceKey;
  hours: HourScore[];
  days: DayScore[];
  now: HourScore | null;
  next48: HourScore | null;
  week: HourScore | null;
};
