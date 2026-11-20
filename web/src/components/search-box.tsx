"use client";

import Form from "next/form";
import { useI18n } from "./i18n-provider";
import { SearchIcon } from "./icons";

/** Search field. Submitting it opens /search?q=... (or /ta/search?q=... in Tamil). */
export function SearchBox({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const { t, path } = useI18n();

  return (
    <Form action={path("/search")} role="search">
      <label htmlFor="search" className="sr-only">
        {t.search.label}
      </label>
      <div className="flex h-12 items-center gap-2 rounded-xl border border-line-strong bg-white px-3.5 focus-within:border-maroon">
        <SearchIcon size={20} className="shrink-0 text-ink-muted" />
        <input
          id="search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder={t.search.placeholder}
          className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-muted"
        />
      </div>
    </Form>
  );
}
