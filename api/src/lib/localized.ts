/** Text the site shows in both languages. */
export type Localized = { en: string; ta: string };

/** Reads an { en, ta } pair from a document, filling any gap with an empty string. */
export function localized(value?: { en?: string | null; ta?: string | null } | null): Localized {
  return { en: value?.en ?? "", ta: value?.ta ?? "" };
}
