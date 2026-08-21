import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { lookupIpFix } from "@/api/ipGeo";
import {
  loadHotspotDesk,
  loadOnePlace,
  placeFromCoord,
  placeFromHotspot,
  type PlaceKey,
  type ScoredPlace,
} from "@/api/pipeline";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MethodPanel } from "@/components/MethodPanel";
import { DayStrip, FactorList, HourlyBars, StatusHero } from "@/components/Desk";
import { Legend, OfficialLinks, PlaceSearch, SavedList } from "@/components/Chrome";
import { HOTSPOTS, hotspotById } from "@/data/hotspots";
import { copy } from "@/i18n/copy";
import { gpsIfAlreadyGranted } from "@/lib/gps";
import { isFiniteCoord } from "@/lib/geo";
import { sanitizePlaceName } from "@/lib/security";
import { inSpainAutoLocate } from "@/lib/spain";
import { loadLang, loadSavedPlaces, persistLang, persistSavedPlaces } from "@/storage/local";
import { dayChip, hourAtClock, pickStripDate } from "@/lib/format";
import type { Lang } from "@/types/lang";
import type { SavedPlace } from "@/types/place";

const MapView = lazy(() => import("@/map/MapView"));

export function App() {
  const [lang, setLang] = useState<Lang>(() => loadLang());
  const [desk, setDesk] = useState<ScoredPlace[]>([]);
  const [active, setActive] = useState<ScoredPlace | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [hourTime, setHourTime] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [outside, setOutside] = useState(false);
  const [followPin, setFollowPin] = useState(true);
  const [focusMode, setFocusMode] = useState<"square" | "pin">("square");
  const [focusTick, setFocusTick] = useState(0);
  const [radarOn, setRadarOn] = useState(false);
  const [saved, setSaved] = useState<SavedPlace[]>(() => loadSavedPlaces());
  const t = copy[lang];

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const all = await loadHotspotDesk();
      setDesk(all);
      setActive((prev) => all.find((x) => x.place.id === prev?.place.id) ?? all.find((x) => x.place.id === "valencia-horta") ?? all[0] ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [all, gps, ip] = await Promise.all([loadHotspotDesk(), gpsIfAlreadyGranted(), lookupIpFix()]);
        if (cancelled) return;
        setDesk(all);
        setFailed(false);
        const valencia = all.find((x) => x.place.id === "valencia-horta") ?? all[0] ?? null;
        const ipOk = ip && ip.country === "ES" && inSpainAutoLocate(ip.lat, ip.lon);
        if (gps) {
          try {
            const scored = await loadOnePlace(placeFromCoord("gps", copy[loadLang()].myLocation, gps.lat, gps.lon));
            if (cancelled) return;
            setActive(scored);
            setDay(null);
            setHourTime(null);
            setOutside(!inSpainAutoLocate(gps.lat, gps.lon));
            setFollowPin(true);
            setFocusMode("pin");
            setFocusTick((n) => n + 1);
            setLoading(false);
            return;
          } catch {
            /* Valencia fallback */
          }
        } else if (ipOk && ip) {
          const name = sanitizePlaceName(ip.city) || copy[loadLang()].myLocation;
          try {
            const scored = await loadOnePlace(placeFromCoord("ip", name, ip.lat, ip.lon));
            if (cancelled) return;
            setActive(scored);
            setDay(null);
            setHourTime(null);
            setOutside(false);
            setFollowPin(true);
            setFocusMode("pin");
            setFocusTick((n) => n + 1);
            setLoading(false);
            return;
          } catch {
            /* Valencia fallback */
          }
        }
        if (cancelled) return;
        setActive(valencia);
        setDay(null);
        setHourTime(null);
        setFollowPin(true);
        setFocusMode("square");
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleDay = pickStripDate(active?.days ?? desk[0]?.days ?? [], day);

  const selectedDay = active?.days.find((d) => d.date === visibleDay) ?? null;
  const selectedHours = selectedDay?.hours ?? [];
  const selectedHour = useMemo(() => {
    if (!selectedDay) return null;
    return selectedDay.hours.find((h) => h.time === hourTime) ?? hourAtClock(selectedDay.hours) ?? selectedDay.peak;
  }, [selectedDay, hourTime]);

  function resetClock() {
    setDay(null);
    setHourTime(null);
  }

  async function selectPlace(place: PlaceKey, markOutside = false, mode: "square" | "pin" = "pin") {
    setOutside(markOutside);
    resetClock();
    setFollowPin(true);
    setFocusMode(mode);
    setFocusTick((n) => n + 1);
    const cached = desk.find((d) => d.place.id === place.id);
    if (cached) {
      setActive(cached);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const scored = await loadOnePlace(place);
      setActive(scored);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  function onHotspot(id: string) {
    const h = hotspotById(id);
    if (!h) return;
    const cached = desk.find((d) => d.place.id === id);
    setOutside(false);
    setFollowPin(true);
    setFocusMode("square");
    setFocusTick((n) => n + 1);
    if (cached) setActive(cached);
    else void selectPlace(placeFromHotspot(h), false, "square");
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (!isFiniteCoord(lat, lon)) return;
        void selectPlace(placeFromCoord("gps", t.myLocation, lat, lon), !inSpainAutoLocate(lat, lon), "pin");
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  function saveActive() {
    if (!active) return;
    const entry: SavedPlace = {
      id: active.place.id.startsWith("gps") || active.place.id === "ip" ? `saved-${String(Date.now())}` : active.place.id,
      name: sanitizePlaceName(active.place.name),
      lat: active.place.lat,
      lon: active.place.lon,
    };
    const next = [entry, ...saved.filter((p) => p.id !== entry.id)].slice(0, 8);
    setSaved(next);
    persistSavedPlaces(next);
  }

  function switchLang(next: Lang) {
    setLang(next);
    persistLang(next);
    document.documentElement.lang = next;
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img
            className="brand-logo"
            src={`${import.meta.env.BASE_URL}vortex.png`}
            alt=""
            width={32}
            height={32}
          />
          <div className="brand-text">
            <strong>{t.title}</strong>
            <span>{t.tag}</span>
          </div>
        </div>
        <OfficialLinks lang={lang} />
        <LanguageSwitcher lang={lang} onChange={switchLang} />
      </header>

      <div className="shell">
        <section className="panel">
          <PlaceSearch
            lang={lang}
            onPick={(hit) => {
              void selectPlace(placeFromCoord(hit.id, hit.name, hit.lat, hit.lon), !inSpainAutoLocate(hit.lat, hit.lon), "pin");
            }}
          />
          <div className="search-row">
            <button type="button" className="ghost" onClick={locate} disabled={locating}>
              {locating ? t.locating : t.locate}
            </button>
            <button type="button" className="ghost" onClick={saveActive} disabled={!active}>
              {t.save}
            </button>
          </div>
          <SavedList
            lang={lang}
            places={saved}
            onPick={(p) => void selectPlace(placeFromCoord(p.id, p.name, p.lat, p.lon), !inSpainAutoLocate(p.lat, p.lon))}
            onRemove={(id) => {
              const next = saved.filter((p) => p.id !== id);
              setSaved(next);
              persistSavedPlaces(next);
            }}
          />
          {failed ? (
            <div className="warn">
              {t.fail}{" "}
              <button type="button" className="solid" onClick={() => void loadDesk()}>
                {t.retry}
              </button>
            </div>
          ) : null}
          {outside ? <div className="warn">{t.outside}</div> : null}
          {loading && !active ? <p>{t.loading}</p> : null}
          {active ? (
            <>
              <StatusHero lang={lang} name={active.place.name} hour={selectedHour} week={active.week} />
              <DayStrip
                lang={lang}
                days={active.days}
                selected={visibleDay}
                onSelect={(date) => {
                  setDay(date);
                  const hours = active.days.find((d) => d.date === date)?.hours ?? [];
                  setHourTime(hourAtClock(hours)?.time ?? null);
                }}
              />
              <HourlyBars lang={lang} hours={selectedHours} selectedTime={selectedHour?.time ?? null} onSelect={setHourTime} />
              <FactorList lang={lang} hour={selectedHour} />
              <MethodPanel lang={lang} />
            </>
          ) : null}
          <Legend lang={lang} />
        </section>
        <Suspense fallback={<div className="map-wrap" />}>
          <MapView
            desk={desk}
            selectedId={active?.place.hotspotId ?? active?.place.id ?? null}
            selectedDate={visibleDay}
            pinLat={active?.place.lat ?? null}
            pinLon={active?.place.lon ?? null}
            followPin={followPin}
            focusMode={focusMode}
            focusTick={focusTick}
            radarOn={radarOn}
            labels={{ radar: t.radar, radarHint: t.radarHint, day: visibleDay ? dayChip(visibleDay, lang) : "" }}
            onRadar={setRadarOn}
            onSelect={onHotspot}
          />
        </Suspense>
      </div>

      <footer className="foot">
        <p>{t.disclaimer.replace("{n}", String(HOTSPOTS.length))}</p>
        <p>
          <a href="https://www.flaticon.com/free-icons/vortex" title="vortex icons" target="_blank" rel="noopener noreferrer">
            Vortex icons created by Magnific - Flaticon
          </a>
        </p>
      </footer>
    </div>
  );
}
