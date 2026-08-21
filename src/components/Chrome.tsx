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
  onPick,
}: {
  lang: Lang;
  onPick: (hit: PlaceHit) => void;
}) {
  const t = copy[lang];
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [empty, setEmpty] = useState(false);
  const skipSuggest = useRef(false);

  function choose(hit: PlaceHit) {
    skipSuggest.current = true;
    setQ(hit.name);
    setHits([]);
    setEmpty(false);
    onPick(hit);
  }

  async function lookup(query: string) {
    try {
      const found = await searchPlaces(query, lang);
      setHits(found);
      setEmpty(found.length === 0);
    } catch {
      setHits([]);
      setEmpty(true);
    }
  }

  useEffect(() => {
    if (skipSuggest.current) {
      skipSuggest.current = false;
      return;
    }
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setEmpty(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const found = await searchPlaces(trimmed, lang);
          if (cancelled) return;
          setHits(found);
          setEmpty(found.length === 0);
        } catch {
          if (cancelled) return;
          setHits([]);
          setEmpty(true);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, lang]);

  async function run(e: FormEvent) {
    e.preventDefault();
    await lookup(q);
  }

  return (
    <div>
      <form className="search-row" onSubmit={(e) => void run(e)}>
        <input
          type="search"
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder={t.search}
          maxLength={80}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="solid search-go" type="submit" aria-label={t.search}>
          <SearchIcon />
        </button>
      </form>
      {empty ? <p className="hero-kicker">{t.emptySearch}</p> : null}
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
