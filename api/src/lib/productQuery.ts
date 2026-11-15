import type { ProductListQuery } from "../schemas";
import { escapeRegex } from "./slug";

type Filter = Record<string, unknown>;
type Sort = Record<string, 1 | -1>;

/**
 * Turns the query string of a product list request into a MongoDB filter.
 * Kept free of database calls so it is easy to test.
 *
 * `categoryIds` is the category from the query, already looked up
 * (the category itself plus its sub-categories). Pass undefined for "any category".
 */
export function buildProductFilter(query: ProductListQuery, categoryIds?: unknown[]): Filter {
  const filter: Filter = {};

  if (categoryIds) filter.category = { $in: categoryIds };
  if (query.tag) filter.tags = query.tag;
  if (query.featured !== undefined) filter.featured = query.featured;
  if (query.inStock !== undefined) filter.inStock = query.inStock;

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {
      ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
    };
  }

  if (query.q) {
    // The search text is escaped, so characters like "(" or "*" are matched literally.
    const pattern = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ "name.en": pattern }, { "name.ta": pattern }, { code: pattern }, { tags: pattern }];
  }

  return filter;
}

export function buildProductSort(sort: ProductListQuery["sort"]): Sort {
  switch (sort) {
    case "price_asc":
      return { price: 1, createdAt: -1 };
    case "price_desc":
      return { price: -1, createdAt: -1 };
    case "name":
      return { "name.en": 1 };
    default:
      return { createdAt: -1 };
  }
}

/** The paging part of a list response. */
export function pageInfo(total: number, page: number, limit: number) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}
