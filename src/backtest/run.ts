import {
  fetchHistoricalEcmwfPatterns,
  fetchHistoricalForecasts,
  fetchHistoricalMarine,
  fetchLeadPrecip,
  type LeadPrecip,
} from "@/api/historical";
import { placeFromHotspot, scoreForecast } from "@/api/pipeline";
import {
  expectedLabel,
  formatReport,
  formatSuite,
  shiftIsoDate,
  suiteCounts,
  summarisePeak,
  verdictFor,
  type BacktestSummary,
  type PlaceDayRow,
  type SuiteCounts,
} from "@/backtest/evaluate";
import { DANA_EVENTS, type DanaEvent } from "@/data/events";
import { HOTSPOTS } from "@/data/hotspots";
import type { ScoredPlace } from "@/types/place";

export type BacktestReport = {
  event: DanaEvent;
  rows: PlaceDayRow[];
  summary: BacktestSummary;
  leads: Array<{ hotspotId: string } & LeadPrecip>;
  text: string;
};

function rowsForPlace(event: DanaEvent, scored: ScoredPlace): PlaceDayRow[] {
  const hotspotId = scored.place.hotspotId ?? scored.place.id;
  return scored.days
    .filter((d) => d.date >= event.startDate && d.date <= event.endDate)
    .map((d) => {
      const expected = expectedLabel(event, hotspotId, d.date);
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
        verdict: verdictFor(expected, d.level),
      };
    });
}

export async function runDanaEvent(event: DanaEvent): Promise<BacktestReport> {
  const fetchStart = shiftIsoDate(event.startDate, -1);
  const coords = HOTSPOTS.map((h) => ({ lat: h.center.lat, lon: h.center.lon }));
  const [marine, forecasts, patterns] = await Promise.all([
    fetchHistoricalMarine(fetchStart, event.endDate),
    fetchHistoricalForecasts(coords, fetchStart, event.endDate),
    fetchHistoricalEcmwfPatterns(coords, fetchStart, event.endDate),
  ]);

  const rows: PlaceDayRow[] = [];
  for (let i = 0; i < HOTSPOTS.length; i += 1) {
    const hotspot = HOTSPOTS[i];
    const forecast = forecasts[i];
    if (!hotspot || !forecast) throw new Error(`Missing historical forecast for hotspot ${i}`);
    const scored = scoreForecast(
      placeFromHotspot(hotspot),
      forecast,
      marine[hotspot.sstStation],
      patterns[i] ?? null,
    );
    rows.push(...rowsForPlace(event, scored));
  }

  const summary = summarisePeak(rows, event.peakDate);
  const leadIds = [...new Set([...event.riuadaHotspotIds, ...event.quietHotspotIds])];
  const leads: Array<{ hotspotId: string } & LeadPrecip> = [];
  for (const id of leadIds) {
    const hotspot = HOTSPOTS.find((h) => h.id === id);
    if (!hotspot) continue;
    const precip = await fetchLeadPrecip(hotspot.center, event.peakDate);
    leads.push({ hotspotId: id, ...precip });
  }

  return {
    event,
    rows,
    summary,
    leads,
    text: formatReport(event, rows, summary, leads),
  };
}

export type DanaSuite = {
  reports: BacktestReport[];
  counts: SuiteCounts;
  text: string;
};

export async function runDanaSuite(events: readonly DanaEvent[] = DANA_EVENTS): Promise<DanaSuite> {
  const reports: BacktestReport[] = [];
  for (const event of events) {
    reports.push(await runDanaEvent(event));
  }
  const summaries = reports.map((r) => r.summary);
  return {
    reports,
    counts: suiteCounts(summaries),
    text: formatSuite(
      reports.map((r) => r.text),
      summaries,
    ),
  };
}
