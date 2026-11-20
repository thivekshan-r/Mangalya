"use client";

import { createContext, useContext } from "react";
import { DICTIONARIES, type Dictionary } from "@/lib/dictionaries";
import { localePath, type Lang } from "@/lib/i18n";

type ClientI18n = { lang: Lang; t: Dictionary; path: (path: string) => string };

const I18nContext = createContext<ClientI18n | null>(null);

/**
 * Makes the page's language available to client components. Only the language
 * code crosses from server to browser; each side looks up its own dictionary.
 */
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value: ClientI18n = { lang, t: DICTIONARIES[lang], path: (path) => localePath(lang, path) };
  return <I18nContext value={value}>{children}</I18nContext>;
}

/** The language, its dictionary, and a helper for addresses, for client components. */
export function useI18n(): ClientI18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
