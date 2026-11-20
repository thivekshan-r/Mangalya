import { lang as langParam } from "next/root-params";
import { DICTIONARIES, type Dictionary } from "./dictionaries";
import { DEFAULT_LANG, isLang, localePath, type Lang } from "./i18n";

export type I18n = {
  lang: Lang;
  t: Dictionary;
  /** The public address of a page in the current language: path("/wholesale"). */
  path: (path: string) => string;
};

export function i18nFor(lang: Lang): I18n {
  return { lang, t: DICTIONARIES[lang], path: (path) => localePath(lang, path) };
}

/**
 * The current page's language, read from the [lang] part of the route.
 * For Server Components; client components use useI18n() instead.
 * Anything that is not a known language falls back to English.
 */
export async function getI18n(): Promise<I18n> {
  const value = await langParam();
  return i18nFor(isLang(value) ? value : DEFAULT_LANG);
}
