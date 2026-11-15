import { SORTS, type Sort } from "./types";

/** The choices a product list page keeps in its address: ?sort=price_asc&stock=in&page=2 */
export type ListParams = { sort: Sort; inStockOnly: boolean; page: number; q?: string };

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Reads the list choices from the address, ignoring anything unexpected. */
export function readListParams(raw: RawParams): ListParams {
  const sort = first(raw.sort) as Sort;
  const page = Number.parseInt(first(raw.page) ?? "1", 10);

  return {
    sort: SORTS.includes(sort) ? sort : "newest",
    inStockOnly: first(raw.stock) === "in",
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
    q: first(raw.q)?.trim().slice(0, 80) || undefined,
  };
}

/** Builds the address of a list page, leaving out choices that are the default. */
export function listHref(path: string, params: Partial<ListParams>): string {
  const query = new URLSearchParams();

  if (params.q) query.set("q", params.q);
  if (params.sort && params.sort !== "newest") query.set("sort", params.sort);
  if (params.inStockOnly) query.set("stock", "in");
  if (params.page && params.page > 1) query.set("page", String(params.page));

  const text = query.toString();
  return text ? `${path}?${text}` : path;
}
