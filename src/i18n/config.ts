export const locales = ["en", "el"] as const;
export type Locale = (typeof locales)[number];

/** English is served without a prefix (`/recipes/...`); other locales get one (`/el/recipes/...`). */
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  el: "Ελληνικά",
};

/** Cookie set by the language switcher so the proxy stops guessing from Accept-Language. */
export const LOCALE_COOKIE = "cs_locale";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** Public URL for a path in a locale, e.g. ("el", "/recipes/x") -> "/el/recipes/x". */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}
