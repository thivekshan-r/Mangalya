"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LANG_NAMES, LANG_TAGS, localePath, splitPath } from "@/lib/i18n";
import { DICTIONARIES } from "@/lib/dictionaries";
import { useI18n } from "./i18n-provider";

/**
 * The "தமிழ் / English" link in the header. It opens the same page in the
 * other language, keeping any search or sort choices in the address.
 */
export function LanguageSwitch() {
  const { lang } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const other = lang === "en" ? "ta" : "en";
  const query = searchParams.toString();
  const href = localePath(other, splitPath(pathname).path) + (query ? `?${query}` : "");

  return (
    <Link
      href={href}
      hrefLang={LANG_TAGS[other].html}
      lang={LANG_TAGS[other].html}
      aria-label={DICTIONARIES[other].nav.switchTo}
      className="flex h-11 min-w-11 items-center justify-center px-1.5 text-sm font-semibold text-gold hover:underline"
    >
      {LANG_NAMES[other]}
    </Link>
  );
}
