"use client";

import Form from "next/form";
import Link from "next/link";
import { SORTS, type Sort } from "@/lib/types";
import { useI18n } from "./i18n-provider";

/**
 * Sort and stock filter for a product list. Changing either reloads the list
 * with the choice in the address (?sort=price_asc&stock=in), so it can be shared.
 */
export function ListControls({
  action,
  sort,
  inStockOnly,
  q,
}: {
  /** The page these controls belong to, with its language prefix, for example "/ta/category/photo-frames". */
  action: string;
  sort: Sort;
  inStockOnly: boolean;
  /** Search text to keep when the controls are used on the search page. */
  q?: string;
}) {
  const { t } = useI18n();

  return (
    <Form
      action={action}
      onChange={(event) => event.currentTarget.requestSubmit()}
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      {q && <input type="hidden" name="q" value={q} />}

      <label htmlFor="sort" className="sr-only">
        {t.list.sortLabel}
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={sort}
        className="h-11 rounded-[10px] border border-line-strong bg-white px-3 font-semibold"
      >
        {SORTS.map((value) => (
          <option key={value} value={value}>
            {t.list.sorts[value]}
          </option>
        ))}
      </select>

      <label className="flex h-11 items-center gap-2">
        <input type="checkbox" name="stock" value="in" defaultChecked={inStockOnly} className="h-5 w-5 accent-maroon" />
        {t.list.inStockOnly}
      </label>

      <noscript>
        <button type="submit" className="h-11 rounded-[10px] border border-maroon px-4 font-semibold text-maroon">
          {t.list.apply}
        </button>
      </noscript>
    </Form>
  );
}

/** Previous / Next links under a product list. */
export function Pagination({ page, pages, hrefs }: { page: number; pages: number; hrefs: { previous: string; next: string } }) {
  const { t } = useI18n();
  if (pages <= 1) return null;

  const button = "flex h-11 items-center rounded-full border border-maroon px-5 font-semibold text-maroon hover:bg-ivory";

  return (
    <nav aria-label={t.common.pages} className="mt-6 flex items-center justify-center gap-4">
      {page > 1 && (
        <Link href={hrefs.previous} className={button}>
          {t.common.previous}
        </Link>
      )}
      <span className="text-sm text-ink-soft">
        {t.common.page(page, pages)}
      </span>
      {page < pages && (
        <Link href={hrefs.next} className={button}>
          {t.common.next}
        </Link>
      )}
    </nav>
  );
}
