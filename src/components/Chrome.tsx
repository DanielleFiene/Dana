import { useState, type FormEvent } from "react";
import { searchPlaces } from "@/api/geocoding";
import { copy } from "@/i18n/copy";
import { AEMET_WARNINGS_URL, PROTECCION_CIVIL_URL } from "@/lib/spain";
import { RISK_LEVELS, RISK_META } from "@/types/risk";
import type { Lang } from "@/types/lang";
import type { PlaceHit, SavedPlace } from "@/types/place";

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

  async function run(e: FormEvent) {
    e.preventDefault();
    const found = await searchPlaces(q, lang);
    setHits(found);
    setEmpty(found.length === 0);
  }

  return (
    <div>
      <form className="search-row" onSubmit={run}>
        <input
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder={t.search}
          maxLength={80}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="solid" type="submit">
          OK
        </button>
      </form>
      {empty ? <p className="hero-kicker">{t.emptySearch}</p> : null}
      <ul className="hits">
        {hits.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => {
                onPick(h);
                setHits([]);
                setQ(h.name);
              }}
            >
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
