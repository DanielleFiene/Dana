import { useEffect, useId, useRef, useState } from "react";
import { copy } from "@/i18n/copy";
import { LANGUAGES, languageById } from "@/types/lang";
import type { Lang } from "@/types/lang";

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 12h18M5.2 7.2h13.6M5.2 16.8h13.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LanguageSwitcher({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  const t = copy[lang];
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = languageById(lang);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="lang-switch" ref={wrap}>
      <button
        type="button"
        className="lang-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t.language}
        onClick={() => setOpen((v) => !v)}
      >
        <GlobeIcon />
      <span className="lang-name">{current.native}</span>
      </button>
      {open ? (
        <ul className="lang-menu" id={menuId} role="listbox" aria-label={t.language}>
          {LANGUAGES.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="option"
                aria-selected={item.id === lang}
                className={item.id === lang ? "on" : undefined}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <span className="lang-native">{item.native}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
