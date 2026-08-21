import { useEffect, useRef, useState, type FormEvent } from "react";
import { searchPlaces } from "@/api/geocoding";
import { copy } from "@/i18n/copy";
import { AEMET_WARNINGS_URL, PROTECCION_CIVIL_URL } from "@/lib/spain";
import { RISK_LEVELS, RISK_META } from "@/types/risk";
import type { Lang } from "@/types/lang";
import type { PlaceHit, SavedPlace } from "@/types/place";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.5 15.5 21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function OfficialLinks({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return (
    <div className="top-actions">
      <a className="ghost" href={AEMET_WARNINGS_URL} target="_blank" rel="noopener noreferrer">
        {t.official}
      </a>
      <a className="ghost" href={PROTECCION_CIVIL_URL} target="_blank" rel="noopener noreferrer">
        {t.civil}
      </a>
    </div>
  );
}

export function PlaceSearch({
  lang,
  selectedName,
  onPick,
}: {
  lang: Lang;
  selectedName: string;
  onPick: (hit: PlaceHit) => void;
}) {
  const t = copy[lang];
  const [draft, setDraft] = useState<string | null>(null);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [empty, setEmpty] = useState(false);
  const timerRef = useRef<number | null>(null);
  const seqRef = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const q = draft ?? selectedName;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (hits.length === 0 && !empty) return;
    function onDoc(e: PointerEvent) {
      if (boxRef.current?.contains(e.target as Node)) return;
      seqRef.current += 1;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setHits([]);
      setEmpty(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      seqRef.current += 1;
      setHits([]);
      setEmpty(false);
    }
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [hits.length, empty]);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  async function fetchHits(query: string) {
    const seq = ++seqRef.current;
    try {
      const found = await searchPlaces(query, lang);
      if (seq !== seqRef.current) return;
      setHits(found);
      setEmpty(found.length === 0);
    } catch {
      if (seq !== seqRef.current) return;
      setHits([]);
      setEmpty(true);
    }
  }

  function scheduleLookup(query: string) {
    clearTimer();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      seqRef.current += 1;
      setHits([]);
      setEmpty(false);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      void fetchHits(trimmed);
    }, 280);
  }

  function choose(hit: PlaceHit) {
    clearTimer();
    seqRef.current += 1;
    setDraft(hit.name);
    setHits([]);
    setEmpty(false);
    onPick(hit);
  }

  async function run(e: FormEvent) {
    e.preventDefault();
    clearTimer();
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      seqRef.current += 1;
      setHits([]);
      setEmpty(false);
      return;
    }
    await fetchHits(trimmed);
  }

  return (
    <div className="search-box" ref={boxRef}>
      <form className="search-row" onSubmit={(e) => void run(e)}>
        <input
          type="search"
          value={q}
          onChange={(ev) => {
            const next = ev.target.value;
            setDraft(next);
            scheduleLookup(next);
          }}
          placeholder={t.search}
          maxLength={80}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        <button className="solid search-go" type="submit" aria-label={t.search}>
          <SearchIcon />
        </button>
      </form>
      {empty ? <p className="hero-kicker">{t.emptySearch}</p> : null}
      {hits.length > 0 ? (
        <ul className="hits">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => choose(h)}>
                {h.name}
                {h.region ? ` · ${h.region}` : ""}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SavedList({
  lang,
  places,
  onPick,
  onRemove,
}: {
  lang: Lang;
  places: SavedPlace[];
  onPick: (p: SavedPlace) => void;
  onRemove: (id: string) => void;
}) {
  const t = copy[lang];
  if (places.length === 0) return null;
  return (
    <div>
      <div className="hero-kicker">{t.saved}</div>
      <ul className="saved">
        {places.map((p) => (
          <li key={p.id}>
            <button type="button" className="pick" onClick={() => onPick(p)}>
              {p.name}
            </button>
            <button type="button" className="kill" onClick={() => onRemove(p.id)} aria-label={t.remove}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return (
    <div className="legend">
      <span>{t.legend}:</span>
      {RISK_LEVELS.map((level) => (
        <span key={level}>
          <i className="swatch" style={{ background: RISK_META[level].color }} />
          {t.levels[level].name}
        </span>
      ))}
      <span className="legend-hint">{t.mapHint}</span>
    </div>
  );
}
