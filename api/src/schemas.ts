import { z } from "zod";

/**
 * The rules for data coming into the API. Each route checks its input
 * against one of these before touching the database.
 *
 * Note: the "write" schemas have no defaults. A PATCH only changes the
 * fields that were sent; a default would silently overwrite the others.
 */

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Not a valid id");

const requiredText = z.object({
  en: z.string().trim().min(1, "The English text is required").max(200),
  ta: z.string().trim().max(200).default(""),
});

const longText = z.object({
  en: z.string().trim().max(5000).default(""),
  ta: z.string().trim().max(5000).default(""),
});

const shortText = z.object({
  en: z.string().trim().max(500).default(""),
  ta: z.string().trim().max(500).default(""),
});

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only")
  .max(80);

const image = z.object({
  url: z.url("Not a valid image address"),
  publicId: z.string().trim().max(300).default(""),
  alt: z.string().trim().max(200).default(""),
});

// ---- Login and accounts ----

// Tidy first (spaces, capitals), then check it is an email address.
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

const newPassword = z.string().min(10, "Use at least 10 characters").max(200);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});

/** Changing your own password: the current one is needed as proof. */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword,
});

/** The owner adding a staff account. */
export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(100),
  email,
  password: newPassword,
});

/** The owner changing a staff account: rename, switch off or on, or set a new password. */
export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(100),
    active: z.boolean(),
    password: newPassword,
  })
  .partial();

// ---- Products ----

export const productWriteSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{1,19}$/, "Use 2 to 20 letters, numbers or dashes"),
  slug,
  name: requiredText,
  description: longText,
  category: objectId,
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20),
  price: z.number().min(0).max(100_000_000).nullable(),
  options: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        values: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
      }),
    )
    .max(10),
  images: z.array(image).max(12),
  inStock: z.boolean(),
  featured: z.boolean(),
  visible: z.boolean(),
});

/** Creating a product: only the name and category are required. */
export const productCreateSchema = productWriteSchema.partial().required({ name: true, category: true });

/** Editing a product: send only the fields that change. */
export const productUpdateSchema = productWriteSchema.partial();

const flag = z.enum(["true", "false"]).transform((value) => value === "true");

export const productListQuerySchema = z.object({
  /** Category slug, for example "photo-frames". */
  category: slug.optional(),
  /** Search text: matches the name in either language, or the product code. */
  q: z.string().trim().max(80).optional(),
  tag: z.string().trim().toLowerCase().max(40).optional(),
  featured: flag.optional(),
  inStock: flag.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).default("newest"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const adminProductListQuerySchema = productListQuerySchema.extend({
  /** Which products to list. "deleted" shows the ones that can still be restored. */
  status: z.enum(["live", "hidden", "deleted", "all"]).default("all"),
});

// ---- Categories ----

export const categoryWriteSchema = z.object({
  slug,
  name: requiredText,
  parent: objectId.nullable(),
  image: z.object({ url: z.url(), publicId: z.string().trim().max(300).default("") }).nullable(),
  order: z.number().int().min(0).max(10_000),
  visible: z.boolean(),
});

export const categoryCreateSchema = categoryWriteSchema.partial().required({ name: true });
export const categoryUpdateSchema = categoryWriteSchema.partial();

// ---- Shop settings ----

export const settingsUpdateSchema = z
  .object({
    whatsappNumber: z
      .string()
      .trim()
      .regex(/^(\d{8,15})?$/, "Use the international format with digits only, for example 9477XXXXXXX"),
    instagramUrl: z.union([z.literal(""), z.url("Not a valid address")]),
    address: shortText,
    openingHours: shortText,
    banners: z
      .array(
        z.object({
          image: z.union([z.literal(""), z.url()]),
          title: shortText,
          link: z.string().trim().max(300).default(""),
        }),
      )
      .max(8),
    defaultLanguage: z.enum(["en", "ta"]),
  })
  .partial();

// ---- Enquiries ----

/** What the wholesale form on the website sends. */
export const enquiryCreateSchema = z.object({
  type: z.enum(["wholesale", "general"]).default("wholesale"),
  name: z.string().trim().min(1, "Enter your name").max(100),
  businessName: z.string().trim().max(150).default(""),
  town: z.string().trim().max(100).default(""),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a phone number"),
  items: z
    .array(
      z.object({
        product: objectId.nullable().default(null),
        description: z.string().trim().min(1, "Say which product").max(300),
        quantity: z.coerce.number().int().min(1).max(100_000).default(1),
      }),
    )
    .max(30)
    .default([]),
  message: z.string().trim().max(2000).default(""),
});

export const enquiryListQuerySchema = z.object({
  status: z.enum(["new", "replied", "closed", "all"]).default("all"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const enquiryUpdateSchema = z.object({
  status: z.enum(["new", "replied", "closed"]),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
