"use client";

import { usePathname } from "next/navigation";
import { isLocale, LOCALE_COOKIE, localeNames, localePath, locales, type Locale } from "@/i18n/config";

/** Path without its locale segment: "/el/recipes/x" -> "/recipes/x", "/en" -> "/". */
export function stripLocale(pathname: string): string {
  const first = pathname.split("/")[1] ?? "";
  // usePathname can report the internal path ("/en/...") for English pages that the proxy
  // rewrote, so strip any locale, not just the non-default ones.
  return isLocale(first) ? pathname.slice(first.length + 1) || "/" : pathname;
}

/** Links to the same page in the other languages, and remembers the choice in a cookie. */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const rest = stripLocale(usePathname());

  return (
    <span aria-label={label} style={{ display: "inline-flex", gap: 10, fontSize: 15 }}>
      {locales.map((l) =>
        l === locale ? (
          <span key={l} aria-current="true" style={{ fontWeight: 600 }}>
            {l.toUpperCase()}
          </span>
        ) : (
          // A plain link, not next/link: a prefetched route was resolved before the cookie
          // existed (and may have been redirected by language), so switching needs a fresh request.
          <a key={l} href={localePath(l, rest)} hrefLang={l} lang={l} onClick={() => rememberLocale(l)} title={localeNames[l]}>
            {l.toUpperCase()}
          </a>
        ),
      )}
    </span>
  );
}

function rememberLocale(value: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}
