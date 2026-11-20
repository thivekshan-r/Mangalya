import { DICTIONARIES } from "./dictionaries";
import type { Lang } from "./i18n";
import type { Localized } from "./types";

/**
 * Picks the text for the page's language, falling back to English when the
 * Tamil text has not been typed in yet.
 */
export function text(value: Localized, lang: Lang = "en"): string {
  return (lang === "ta" && value.ta.trim()) || value.en;
}

/** "Rs. 4,500" / "ரூ. 4,500", or "Ask for price" when the shop has not set one. */
export function formatPrice(price: number | null, lang: Lang = "en"): string {
  const t = DICTIONARIES[lang].common;
  if (price === null) return t.askForPrice;
  return `${t.rupees} ${new Intl.NumberFormat("en-US").format(price)}`;
}

/** "@mangalya_batti" from the Instagram address. */
export function instagramHandle(url: string): string {
  const handle = url.replace(/\/+$/, "").split("/").pop();
  return handle ? `@${handle}` : "Instagram";
}
