"use client";

import Form from "next/form";
import Link from "next/link";
import type { Sort } from "@/lib/types";

const SORT_LABELS: Record<Sort, string> = {
  newest: "Newest first",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  name: "Name: A to Z",
};

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
  /** The page these controls belong to, for example "/category/photo-frames". */
  action: string;
  sort: Sort;
  inStockOnly: boolean;
  /** Search text to keep when the controls are used on the search page. */
  q?: string;
}) {
  return (
    <Form
      action={action}
      onChange={(event) => event.currentTarget.requestSubmit()}
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      {q && <input type="hidden" name="q" value={q} />}

      <label htmlFor="sort" className="sr-only">
        Sort products
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={sort}
        className="h-11 rounded-[10px] border border-line-strong bg-white px-3 font-semibold"
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label className="flex h-11 items-center gap-2">
        <input type="checkbox" name="stock" value="in" defaultChecked={inStockOnly} className="h-5 w-5 accent-maroon" />
        In stock only
      </label>

      <noscript>
        <button type="submit" className="h-11 rounded-[10px] border border-maroon px-4 font-semibold text-maroon">
          Apply
        </button>
      </noscript>
    </Form>
  );
}

/** Previous / Next links under a product list. */
export function Pagination({ page, pages, hrefs }: { page: number; pages: number; hrefs: { previous: string; next: string } }) {
  if (pages <= 1) return null;

  const button = "flex h-11 items-center rounded-full border border-maroon px-5 font-semibold text-maroon hover:bg-ivory";

  return (
    <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-4">
      {page > 1 && (
        <Link href={hrefs.previous} className={button}>
          Previous
        </Link>
      )}
      <span className="text-sm text-ink-soft">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link href={hrefs.next} className={button}>
          Next
        </Link>
      )}
    </nav>
  );
}
