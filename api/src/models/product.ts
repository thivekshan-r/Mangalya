import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { localized } from "../lib/localized";
import type { CategoryDoc } from "./category";

/** How long a deleted product can still be restored. */
export const RESTORE_WINDOW_DAYS = 30;

const optionSchema = new Schema(
  {
    /** For example "Size" or "Frame colour". */
    name: { type: String, required: true, trim: true },
    /** For example ["8 × 10", "10 × 12"]. */
    values: { type: [String], default: [] },
  },
  { _id: false },
);

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    /** The image host's own id, needed to delete the file later. */
    publicId: { type: String, default: "" },
    alt: { type: String, default: "" },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    /** Short code the shop uses to find the item, shown in WhatsApp orders. */
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    /** Readable part of the product's web address. */
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: {
      en: { type: String, required: true, trim: true },
      ta: { type: String, default: "", trim: true },
    },
    description: {
      en: { type: String, default: "" },
      ta: { type: String, default: "" },
    },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    /** Free labels for filtering, for example "wedding", "christian", "hindu". */
    tags: { type: [String], default: [] },
    /** Price in rupees. null means "ask on WhatsApp". */
    price: { type: Number, default: null, min: 0 },
    options: { type: [optionSchema], default: [] },
    /** The first image is the cover. */
    images: { type: [imageSchema], default: [] },
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    /** Hidden products stay in the admin panel but not on the website. */
    visible: { type: Boolean, default: true },
    /** Set when the product is deleted. null for live products. */
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// MongoDB removes a deleted product for good once the restore window has passed.
// Products with deletedAt = null are never touched.
productSchema.index({ deletedAt: 1 }, { expireAfterSeconds: RESTORE_WINDOW_DAYS * 24 * 60 * 60 });
productSchema.index({ visible: 1, deletedAt: 1, createdAt: -1 });

export type ProductFields = InferSchemaType<typeof productSchema>;
export type ProductDoc = HydratedDocument<ProductFields>;

export const Product = model("Product", productSchema);

function isCategoryDoc(value: unknown): value is CategoryDoc {
  return typeof value === "object" && value !== null && "slug" in value && "name" in value;
}

/**
 * The shape of a product in API responses.
 * `admin: true` adds the fields only the admin panel should see.
 */
export function serializeProduct(product: ProductDoc, { admin = false }: { admin?: boolean } = {}) {
  const category: unknown = product.category;

  return {
    id: product.id as string,
    code: product.code,
    slug: product.slug,
    name: localized(product.name),
    description: localized(product.description),
    category: isCategoryDoc(category)
      ? { id: category.id as string, slug: category.slug, name: localized(category.name) }
      : category
        ? { id: String(category) }
        : null,
    tags: [...product.tags],
    price: product.price ?? null,
    options: product.options.map((option) => ({ name: option.name, values: [...option.values] })),
    images: product.images.map((image) => ({
      url: image.url,
      alt: image.alt,
      ...(admin ? { publicId: image.publicId } : {}),
    })),
    inStock: product.inStock,
    featured: product.featured,
    ...(admin
      ? {
          visible: product.visible,
          deletedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
        }
      : {}),
  };
}
