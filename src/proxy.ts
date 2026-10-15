import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, locales } from "@/i18n/config";

/**
 * Locale routing. Every page lives under `app/[lang]`, but English is served without a prefix:
 *   /recipes/x     -> rewritten to /en/recipes/x
 *   /en/recipes/x  -> redirected to /recipes/x (one canonical URL)
 *   /el/recipes/x  -> served as is
 * A visitor landing on the home page whose browser prefers Greek is sent to /el, unless the
 * language switcher's cookie says otherwise. Deep links are never redirected, so a shared
 * English recipe link opens in English.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";

  if (first === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(defaultLocale.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (isLocale(first)) return NextResponse.next();

  if (pathname === "/") {
    const preferred = request.cookies.get(LOCALE_COOKIE)?.value ?? preferredFromHeader(request);
    if (preferred && preferred !== defaultLocale && isLocale(preferred)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${preferred}`;
      return NextResponse.redirect(url);
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(url);
}

function preferredFromHeader(request: NextRequest): string | undefined {
  const header = request.headers.get("accept-language");
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.split("-")[0].toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.find((r) => (locales as readonly string[]).includes(r.lang))?.lang;
}

export const config = {
  // Skip API routes, Next internals and anything that looks like a file (favicon.ico, robots.txt).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
