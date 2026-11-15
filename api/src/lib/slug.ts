/**
 * Turns a name into the readable part of a web address:
 * "Wooden Wedding Frame 12×18" -> "wooden-wedding-frame-12x18".
 */
export function slugify(text: string): string {
  return text
    .normalize("NFKD") // split accented letters into letter + accent
    .replace(/[̀-ͯ]/g, "") // drop the accents
    .replace(/×/g, "x")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-") // anything that is not a letter or number becomes a dash
    .replace(/^-+|-+$/g, "") // no dashes at the ends
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Returns `base`, or `base-2`, `base-3`... until `isTaken` says the slug is free.
 */
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = base || "item";
  let candidate = root;

  for (let attempt = 2; await isTaken(candidate); attempt += 1) {
    candidate = `${root}-${attempt}`;
    if (attempt > 200) throw new Error(`Could not find a free slug for "${root}"`);
  }

  return candidate;
}

/** Escapes text so it can be searched for literally inside a regular expression. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
