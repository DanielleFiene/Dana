export const LANGS = ["ca", "es", "en", "de", "nl", "cs"] as const;

export type Lang = (typeof LANGS)[number];

export type LanguageOption = {
  id: Lang;
  native: string;
  locale: string;
};

/** Autonyms, in the order shown in the switcher. */
export const LANGUAGES: readonly LanguageOption[] = [
  { id: "ca", native: "Català", locale: "ca-ES" },
  { id: "es", native: "Castellano", locale: "es-ES" },
  { id: "en", native: "English", locale: "en-GB" },
  { id: "de", native: "Deutsch", locale: "de-DE" },
  { id: "nl", native: "Nederlands", locale: "nl-NL" },
  { id: "cs", native: "Čeština", locale: "cs-CZ" },
] as const;

export function isLang(value: string | null | undefined): value is Lang {
  return !!value && (LANGS as readonly string[]).includes(value);
}

export function languageById(id: Lang): LanguageOption {
  const row = LANGUAGES.find((item) => item.id === id);
  if (!row) throw new Error(`unknown lang ${id}`);
  return row;
}

export function localeFor(lang: Lang): string {
  return languageById(lang).locale;
}
