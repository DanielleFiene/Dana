import {
  fetchHistoricalArome,
  fetchHistoricalEcmwfPatterns,
  fetchHistoricalForecasts,
  fetchHistoricalMarine,
  fetchLeadPrecip,
  type LeadPrecip,
} from "@/api/historical";
import { aromePrecipAvailable } from "@/api/arome";
import { probeEcmwfEnsemble } from "@/api/ensemble";
import { placeFromHotspot, scoreForecast } from "@/api/pipeline";
import {
  expectedLabel,
  formatReport,
  formatSuite,
  deskMechanismFor,
  shiftIsoDate,
  suiteCounts,
  summariseLabelled,
  thinMarginTags,
  verdictFor,
  type BacktestSummary,
  type PlaceDayRow,
  type SuiteCounts,
} from "@/backtest/evaluate";
import { hingeMargin } from "@/backtest/margin";
import { compareAromeToMix, formatAromeCompare, formatMagreSpatial, type AromeDelta } from "@/backtest/arome";
import { fetchMagreLeadContrast, formatMagreLeadContrast, fetchMallorcaLeadContrast, formatMallorcaLeadContrast } from "@/backtest/leads";
import { DANA_EVENTS, labelledDates, type DanaEvent } from "@/data/events";
import { type RainSource } from "@/data/mechanisms";
import { aromeCovers, HOTSPOTS, INLAND_AROME_RULE_MIN_CELLS } from "@/data/hotspots";
import { TURIS } from "@/data/probes";
import type { ForecastJson } from "@/api/schemas";
import type { ScoredPlace } from "@/types/place";

export type { RainSource };

export type BacktestReport = {
  event: DanaEvent;
  source: RainSource;
  rows: PlaceDayRow[];
  summary: BacktestSummary;
  leads: Array<{ hotspotId: string } & LeadPrecip>;
  aromeForecastByHotspot: Map<string, ForecastJson | null>;
  text: string;
};

function rowsForPlace(event: DanaEvent, scored: ScoredPlace, source: RainSource): PlaceDayRow[] {
  const hotspotId = scored.place.hotspotId ?? scored.place.id;
  return scored.days
    .filter((d) => d.date >= event.startDate && d.date <= event.endDate)
    .map((d) => {
      const expected = expectedLabel(event, hotspotId, d.date);
      const verdict = verdictFor(expected, d.level);
      const floodProne = scored.place.floodProne;
      const margin =
        expected === "unlabelled"
          ? null
          : hingeMargin({
              setup: d.peak.setup,
              impact: d.peak.impact,
              precip24hMm: d.peak.precip24hMm ?? d.precipMm,
              precip48hMm: d.peak.precip48hMm ?? 0,
              floodProne,
              verdict,
            });
      return {
        hotspotId,
        name: scored.place.name,
        date: d.date,
        dayLevel: d.level,
        peakHourLevel: d.peak.level,
        precipMm: d.precipMm,
        maxSetup: Math.max(...d.hours.map((h) => h.setup), 0),
        maxImpact: Math.max(...d.hours.map((h) => h.impact), 0),
        expected,
        verdict,
        deskMechanism: deskMechanismFor(event.id, hotspotId, verdict, d.date, source),
        margin,
      };
    });
}

export async function runDanaEvent(
  event: DanaEvent,
  source: RainSource = "mix",
): Promise<BacktestReport> {
  const fetchStart = shiftIsoDate(event.startDate, -1);
  const coords = HOTSPOTS.map((h) => ({ lat: h.center.lat, lon: h.center.lon }));
  const covered = HOTSPOTS.filter((h) => aromeCovers(h.id));
  const marine = await fetchHistoricalMarine(fetchStart, event.endDate);
  const mixForecasts =
    source === "mix"
      ? await fetchHistoricalForecasts(coords, fetchStart, event.endDate)
      : ([] as ForecastJson[]);
  const patterns = await fetchHistoricalEcmwfPatterns(coords, fetchStart, event.endDate);
  const aromeForecasts =
    source === "arome"
      ? await fetchHistoricalArome(
          covered.map((h) => h.center),
          fetchStart,
          event.endDate,
        )
      : ([] as Array<ForecastJson | null>);

  const aromeById = new Map<string, ForecastJson | null>();
  if (source === "arome") {
    covered.forEach((h, i) => aromeById.set(h.id, aromeForecasts[i] ?? null));
  }

  const rows: PlaceDayRow[] = [];
  for (let i = 0; i < HOTSPOTS.length; i += 1) {
    const hotspot = HOTSPOTS[i];
    if (!hotspot) throw new Error(`Missing hotspot ${i}`);
    if (source === "arome" && !aromeCovers(hotspot.id)) continue;
    const forecast = source === "arome" ? aromeById.get(hotspot.id) : mixForecasts[i];
    if (!forecast) {
      if (source === "arome") {
        aromeById.set(hotspot.id, null);
        continue;
      }
      throw new Error(`Missing historical forecast for hotspot ${hotspot.id}`);
    }
    if (source === "arome" && !aromePrecipAvailable(forecast)) continue;
    const scored = scoreForecast(
      placeFromHotspot(hotspot),
      forecast,
      marine[hotspot.sstStation],
      patterns[i] ?? null,
    );
    rows.push(...rowsForPlace(event, scored, source));
  }

  const summary = summariseLabelled(rows, labelledDates(event));
  const leadIds = [...new Set([...event.riuadaHotspotIds, ...event.quietHotspotIds])];
  const leads: Array<{ hotspotId: string } & LeadPrecip> = [];
  if (source === "mix") {
    for (const id of leadIds) {
      const hotspot = HOTSPOTS.find((h) => h.id === id);
      if (!hotspot) continue;
      const precip = await fetchLeadPrecip(hotspot.center, event.peakDate);
      leads.push({ hotspotId: id, ...precip });
    }
  }

  let text = formatReport(event, rows, summary, leads, source);
  if (source === "arome") {
    text = `AROME France rain (explicit model, ECMWF 500 hPa still merged)\n${text}`;
  }

  return {
    event,
    source,
    rows,
    summary,
    leads,
    aromeForecastByHotspot: aromeById,
    text,
  };
}

export type DanaSuite = {
  reports: BacktestReport[];
  counts: SuiteCounts;
  aromeDeltas: AromeDelta[];
  text: string;
};

export async function runDanaSuite(events: readonly DanaEvent[] = DANA_EVENTS): Promise<DanaSuite> {
  const reports: BacktestReport[] = [];
  const aromeReports: BacktestReport[] = [];
  for (const event of events) {
    if (reports.length > 0) await new Promise((r) => setTimeout(r, 2000));
    const mix = await runDanaEvent(event, "mix");
    reports.push(mix);
    await new Promise((r) => setTimeout(r, 1500));
    aromeReports.push(await runDanaEvent(event, "arome"));
  }

  const deltas = reports.flatMap((mix, i) =>
    compareAromeToMix(mix, aromeReports[i]!, aromeReports[i]!.aromeForecastByHotspot),
  );

  const summaries = reports.map((r) => r.summary);
  let text = formatSuite(
    reports.map((r) => r.text),
    summaries,
    reports.map((r) => r.event.id),
    reports.flatMap((r) => thinMarginTags(r.event.id, r.rows)),
  );

  const mallorca = reports.find((r) => r.event.id === "2024-10-mallorca");
  if (mallorca) {
    const contrast = await fetchMallorcaLeadContrast(mallorca.event.peakDate);
    text = `${text}\n\n${formatMallorcaLeadContrast(contrast)}`;
  }

  const magre = reports.find((r) => r.event.id === "2024-10-magre");
  const magreArome = aromeReports.find((r) => r.event.id === "2024-10-magre");
  if (magre) {
    const contrast = await fetchMagreLeadContrast(magre.event.peakDate);
    text = `${text}\n\n${formatMagreLeadContrast(contrast)}`;
    if (magreArome) text = `${text}\n\n${formatMagreSpatial(magre.rows, magreArome.rows)}`;
  }

  try {
    const ens = await probeEcmwfEnsemble(TURIS);
    text = `${text}\n\nECMWF IFS ENS at Turís: ${ens.members} precip members, grid ${ens.latitude.toFixed(2)}, ${ens.longitude.toFixed(2)} (0.25°). No chance % until SAIH calibrates those members. SAIH does not let AROME into the live score.`;
  } catch {
    text = `${text}\n\nECMWF IFS ENS probe failed. Still no chance % on the desk.`;
  }

  text = `${text}\n\n${formatAromeCompare(deltas)}`;
  text = `${text}\n\nMallorca 28 Oct and Almería 11 Nov are labelled. They do not increment inland-orographic (still 1 of ${INLAND_AROME_RULE_MIN_CELLS}).`;

  return {
    reports,
    counts: suiteCounts(summaries),
    aromeDeltas: deltas,
    text,
  };
}
