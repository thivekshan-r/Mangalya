import type { Localized } from "./types";

export const SITE_NAME = "Mangalya";
export const SITE_TAGLINE = "Photo frames, gifts and ornaments";

/**
 * Picks the text for the page's language, falling back to English when the
 * Tamil text is empty. The site is English-only until Step 6 adds the switch.
 */
export function text(value: Localized, language: "en" | "ta" = "en"): string {
  return (language === "ta" && value.ta) || value.en;
}

/** "Rs. 4,500", or "Ask for price" when the shop has not set one. */
export function formatPrice(price: number | null): string {
  if (price === null) return "Ask for price";
  return `Rs. ${new Intl.NumberFormat("en-US").format(price)}`;
}

/** "@mangalya_batti" from the Instagram address. */
export function instagramHandle(url: string): string {
  const handle = url.replace(/\/+$/, "").split("/").pop();
  return handle ? `@${handle}` : "Instagram";
}
