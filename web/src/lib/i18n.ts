/**
 * The site's languages and how they appear in addresses.
 *
 * English pages keep their plain addresses (/product/teak-frame), so links
 * already shared on WhatsApp keep working. Tamil pages live under /ta
 * (/ta/product/teak-frame). Inside the app every customer page sits under
 * app/[lang]; the proxy (src/proxy.ts) maps the plain English addresses onto /en.
 *
 * Safe to import from both server and client components.
 */

export const LANGS = ["en", "ta"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "en";

/** The language each one is called in its own script, for the switch in the header. */
export const LANG_NAMES: Record<Lang, string> = { en: "English", ta: "தமிழ்" };

/** Language codes for <html lang>, link previews and search engines. */
export const LANG_TAGS: Record<Lang, { html: string; openGraph: string }> = {
  en: { html: "en", openGraph: "en_LK" },
  ta: { html: "ta", openGraph: "ta_LK" },
};

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

/**
 * The public address of a page in a language:
 * localePath("en", "/wholesale") -> "/wholesale"
 * localePath("ta", "/wholesale") -> "/ta/wholesale"
 * localePath("ta", "/")          -> "/ta"
 */
export function localePath(lang: Lang, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (lang === DEFAULT_LANG) return clean;
  return clean === "/" ? `/${lang}` : `/${lang}${clean}`;
}

/**
 * Takes the language prefix off a public address:
 * "/ta/product/x" -> { lang: "ta", path: "/product/x" }
 * "/product/x"    -> { lang: "en", path: "/product/x" }
 */
export function splitPath(pathname: string): { lang: Lang; path: string } {
  for (const lang of LANGS) {
    if (lang === DEFAULT_LANG) continue;
    if (pathname === `/${lang}`) return { lang, path: "/" };
    if (pathname.startsWith(`/${lang}/`)) return { lang, path: pathname.slice(lang.length + 1) };
  }
  return { lang: DEFAULT_LANG, path: pathname || "/" };
}

/**
 * Tells search engines which address shows the same page in each language,
 * for the `alternates` field of a page's metadata.
 */
export function alternates(lang: Lang, path: string) {
  return {
    canonical: localePath(lang, path),
    languages: {
      en: localePath("en", path),
      ta: localePath("ta", path),
      "x-default": localePath(DEFAULT_LANG, path),
    },
  };
}
