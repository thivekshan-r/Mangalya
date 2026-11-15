import { cacheLife, cacheTag } from "next/cache";
import { sampleCategories, sampleProduct, sampleProducts, sampleSettings } from "./sample-data";
import type { Category, ProductDetail, ProductList, ProductQuery, Settings } from "./types";

/**
 * Where every page gets its data.
 *
 * - With API_URL set (web/.env.local, or the host's settings on the live site),
 *   data comes from the Express API.
 * - Without it, the site shows the sample catalogue in sample-data.ts, so the
 *   front end can be built before the database exists.
 *
 * Results are cached for a few minutes ("use cache"), so most visits do not
 * wait for the API. If the API cannot be reached the function returns null,
 * the page shows a short "could not load" message, and the next request tries again.
 */

const API_URL = (process.env.API_URL ?? "").trim().replace(/\/+$/, "");

/** True while the site is not connected to the API. */
export const usingSampleData = API_URL === "";

class NotFoundError extends Error {}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(10_000) });

  if (response.status === 404) throw new NotFoundError(path);
  if (!response.ok) throw new Error(`API ${response.status} for ${path}`);

  return (await response.json()) as T;
}

function toQueryString(query: ProductQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }

  const text = params.toString();
  return text ? `?${text}` : "";
}

/** A page of products. null when the API cannot be reached. */
export async function getProducts(query: ProductQuery = {}): Promise<ProductList | null> {
  "use cache";
  cacheTag("catalogue");

  if (usingSampleData) {
    cacheLife("minutes");
    return sampleProducts(query);
  }

  try {
    const list = await apiGet<ProductList>(`/api/products${toQueryString(query)}`);
    cacheLife("minutes");
    return list;
  } catch {
    cacheLife("seconds"); // do not remember a failure
    return null;
  }
}

/** One product with its related products. "not-found" when there is no such product. */
export async function getProduct(slug: string): Promise<ProductDetail | "not-found" | null> {
  "use cache";
  cacheTag("catalogue");

  if (usingSampleData) {
    cacheLife("minutes");
    return sampleProduct(slug) ?? "not-found";
  }

  try {
    const detail = await apiGet<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`);
    cacheLife("minutes");
    return detail;
  } catch (error) {
    if (error instanceof NotFoundError) {
      cacheLife("minutes");
      return "not-found";
    }
    cacheLife("seconds");
    return null;
  }
}

/** Visible categories in menu order. null when the API cannot be reached. */
export async function getCategories(): Promise<Category[] | null> {
  "use cache";
  cacheTag("catalogue");

  if (usingSampleData) {
    cacheLife("minutes");
    return sampleCategories();
  }

  try {
    const { items } = await apiGet<{ items: Category[] }>("/api/categories");
    cacheLife("minutes");
    return items;
  } catch {
    cacheLife("seconds");
    return null;
  }
}

const DEFAULT_SETTINGS: Settings = {
  whatsappNumber: "",
  instagramUrl: "https://www.instagram.com/mangalya_batti",
  address: { en: "", ta: "" },
  openingHours: { en: "", ta: "" },
};

/** Shop settings. Falls back to safe defaults, so the header and footer always render. */
export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheTag("settings");

  if (usingSampleData) {
    cacheLife("minutes");
    return sampleSettings();
  }

  try {
    const { settings } = await apiGet<{ settings: Settings }>("/api/settings");
    cacheLife("minutes");
    return settings;
  } catch {
    cacheLife("seconds");
    return DEFAULT_SETTINGS;
  }
}
