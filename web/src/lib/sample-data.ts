import type { Category, Product, ProductDetail, ProductList, ProductQuery, Settings } from "./types";

/**
 * Sample catalogue, used only while the website is not connected to the API
 * (no API_URL in web/.env.local). It lets the pages be built and checked
 * before the database exists. Names and prices here are made up.
 */

const CATEGORIES: Category[] = [
  { id: "c1", slug: "photo-frames", name: { en: "Photo frames", ta: "" }, parent: null, image: null, order: 1 },
  { id: "c2", slug: "gift-items", name: { en: "Gift items", ta: "" }, parent: null, image: null, order: 2 },
  { id: "c4", slug: "hindu-ornaments", name: { en: "Hindu ornaments", ta: "" }, parent: null, image: null, order: 3 },
  { id: "c3", slug: "christian-ornaments", name: { en: "Christian ornaments", ta: "" }, parent: null, image: null, order: 4 },
];

const FRAME_OPTIONS = [
  { name: "Size (inches)", values: ["8 × 10", "10 × 12", "12 × 18"] },
  { name: "Frame colour", values: ["Gold", "Brown", "Black"] },
];

type Draft = {
  name: string;
  category: string;
  price: number | null;
  description?: string;
  options?: Product["options"];
  tags?: string[];
  inStock?: boolean;
  featured?: boolean;
};

// Newest first.
const DRAFTS: Draft[] = [
  { name: "Wooden wedding frame", category: "photo-frames", price: 4500, options: FRAME_OPTIONS, tags: ["wedding"], featured: true, description: "A solid wooden frame for wedding portraits, with glass front and a hook for hanging." },
  { name: "Brass oil lamp", category: "hindu-ornaments", price: 3200, featured: true, description: "A traditional brass lamp for the prayer room." },
  { name: "Gold border family frame", category: "photo-frames", price: 2800, options: FRAME_OPTIONS },
  { name: "Wooden wall cross", category: "christian-ornaments", price: 1800, featured: true },
  { name: "Collage frame, 6 photos", category: "photo-frames", price: 5200, inStock: false },
  { name: "Photo mug", category: "gift-items", price: 950, featured: true, description: "A ceramic mug printed with your photo." },
  { name: "Carved teak frame", category: "photo-frames", price: null, options: FRAME_OPTIONS, description: "Hand-carved teak. Made to order, so the price depends on the size." },
  { name: "Table-top photo frame", category: "photo-frames", price: 1200 },
  { name: "Deity photo frame", category: "photo-frames", price: 1500, tags: ["hindu"] },
  { name: "Gift box set", category: "gift-items", price: 2400 },
  { name: "Framed Bible verse", category: "christian-ornaments", price: 1400 },
  { name: "Brass bell", category: "hindu-ornaments", price: 1100 },
];

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const PRODUCTS: Product[] = DRAFTS.map((draft, index) => {
  const category = CATEGORIES.find((item) => item.slug === draft.category);

  return {
    id: `p${index + 1}`,
    code: `SAMPLE-${index + 1}`,
    slug: slugify(draft.name),
    name: { en: draft.name, ta: "" },
    description: { en: draft.description ?? "", ta: "" },
    category: category ? { id: category.id, slug: category.slug, name: category.name } : null,
    tags: draft.tags ?? [],
    price: draft.price,
    options: draft.options ?? [],
    images: [],
    inStock: draft.inStock ?? true,
    featured: draft.featured ?? false,
  };
});

export function sampleCategories(): Category[] {
  return CATEGORIES;
}

/** The same filtering, sorting and paging the API does, over the sample products. */
export function sampleProducts(query: ProductQuery): ProductList {
  const search = query.q?.trim().toLowerCase();

  const items = PRODUCTS.filter((product) => {
    if (query.category && product.category?.slug !== query.category) return false;
    if (query.featured !== undefined && product.featured !== query.featured) return false;
    if (query.inStock !== undefined && product.inStock !== query.inStock) return false;
    if (search) {
      const haystack = [product.name.en, product.name.ta, product.code, ...product.tags].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  // Products without a price sort last, whichever way the prices run.
  const priceOf = (product: Product, missing: number) => product.price ?? missing;
  switch (query.sort) {
    case "price_asc":
      items.sort((a, b) => priceOf(a, Infinity) - priceOf(b, Infinity));
      break;
    case "price_desc":
      items.sort((a, b) => priceOf(b, -Infinity) - priceOf(a, -Infinity));
      break;
    case "name":
      items.sort((a, b) => a.name.en.localeCompare(b.name.en));
      break;
  }

  const limit = query.limit ?? 12;
  const page = query.page ?? 1;

  return {
    items: items.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total: items.length,
    pages: Math.max(1, Math.ceil(items.length / limit)),
  };
}

export function sampleProduct(slug: string): ProductDetail | null {
  const product = PRODUCTS.find((item) => item.slug === slug);
  if (!product) return null;

  const related = PRODUCTS.filter(
    (item) => item.category?.slug === product.category?.slug && item.id !== product.id,
  ).slice(0, 4);

  return { product, related };
}

export function sampleSettings(): Settings {
  return {
    // Put your own number in web/.env.local to try the order buttons.
    whatsappNumber: (process.env.WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
    instagramUrl: "https://www.instagram.com/mangalya_batti",
    address: { en: "", ta: "" },
    openingHours: { en: "", ta: "" },
  };
}
