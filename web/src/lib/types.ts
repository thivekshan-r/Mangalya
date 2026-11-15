/**
 * The shapes of the data the website shows.
 * They match what the API sends (see api/src/models/*.ts, the serialize functions).
 */

/** Text stored in both languages. Tamil may be empty. */
export type Localized = { en: string; ta: string };

export type Category = {
  id: string;
  slug: string;
  name: Localized;
  parent: string | null;
  image: { url: string } | null;
  order: number;
};

export type ProductOption = { name: string; values: string[] };

export type Product = {
  id: string;
  code: string;
  slug: string;
  name: Localized;
  description: Localized;
  category: { id: string; slug: string; name: Localized } | null;
  tags: string[];
  /** Rupees. null means "ask for the price". */
  price: number | null;
  options: ProductOption[];
  /** The first image is the cover. */
  images: { url: string; alt: string }[];
  inStock: boolean;
  featured: boolean;
};

export type ProductList = {
  items: Product[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ProductDetail = { product: Product; related: Product[] };

export type Settings = {
  /** International format, digits only: 9477XXXXXXX. Empty until the shop sets it. */
  whatsappNumber: string;
  instagramUrl: string;
  address: Localized;
  openingHours: Localized;
};

export const SORTS = ["newest", "price_asc", "price_desc", "name"] as const;
export type Sort = (typeof SORTS)[number];

export type ProductQuery = {
  /** Category slug. */
  category?: string;
  /** Search text. */
  q?: string;
  featured?: boolean;
  inStock?: boolean;
  sort?: Sort;
  page?: number;
  limit?: number;
};
