import { randomInt } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from "../lib/images";
import { buildProductFilter, buildProductSort, pageInfo } from "../lib/productQuery";
import { slugify, uniqueSlug } from "../lib/slug";
import { parse } from "../lib/validate";
import { requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/errors";
import { Category, serializeCategory } from "../models/category";
import { Product, serializeProduct } from "../models/product";
import { getSettings, serializeSettings } from "../models/settings";
import {
  adminProductListQuerySchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  settingsUpdateSchema,
} from "../schemas";

/**
 * Endpoints for the admin panel. Everything here already requires a login
 * (see app.ts). Owners and staff can manage products and categories;
 * only owners can change shop settings or delete for good.
 */
export const adminRouter = Router();

// ---------------------------------------------------------------- Products

/** GET /api/admin/products?status=live|hidden|deleted|all  Same filters as the public list. */
adminRouter.get("/products", async (req, res) => {
  const query = parse(adminProductListQuerySchema, req.query);

  let categoryIds: unknown[] | undefined;
  if (query.category) {
    const category = await Category.findOne({ slug: query.category });
    const children = category ? await Category.find({ parent: category._id }).select("_id") : [];
    categoryIds = category ? [category._id, ...children.map((child) => child._id)] : [];
  }

  const status = {
    live: { deletedAt: null, visible: true },
    hidden: { deletedAt: null, visible: false },
    deleted: { deletedAt: { $ne: null } },
    all: { deletedAt: null },
  }[query.status];

  const filter = { ...buildProductFilter(query, categoryIds), ...status };

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(buildProductSort(query.sort))
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate("category"),
    Product.countDocuments(filter),
  ]);

  res.json({
    items: items.map((product) => serializeProduct(product, { admin: true })),
    ...pageInfo(total, query.page, query.limit),
  });
});

/** GET /api/admin/products/:id */
adminRouter.get("/products/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).populate("category");
  if (!product) throw new HttpError(404, "Product not found");

  res.json({ product: serializeProduct(product, { admin: true }) });
});

/** POST /api/admin/products  Only `name` and `category` are required. */
adminRouter.post("/products", async (req, res) => {
  const input = parse(productCreateSchema, req.body);
  await assertCategoryExists(input.category);

  const product = await Product.create({
    ...input,
    code: input.code ?? (await newProductCode()),
    slug: await uniqueSlug(input.slug ?? slugify(input.name.en), (slug) => productSlugTaken(slug)),
  });

  await product.populate("category");
  res.status(201).json({ product: serializeProduct(product, { admin: true }) });
});

/** PATCH /api/admin/products/:id  Send only the fields that change. */
adminRouter.patch("/products/:id", async (req, res) => {
  const input = parse(productUpdateSchema, req.body);

  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });
  if (!product) throw new HttpError(404, "Product not found");

  if (input.category) await assertCategoryExists(input.category);

  // The web address stays the same when the name changes, so shared links keep working.
  // It only changes when a new slug is sent on purpose.
  if (input.slug && input.slug !== product.slug && (await productSlugTaken(input.slug, product.id))) {
    throw new HttpError(409, "That slug is already in use", { fields: ["slug"] });
  }

  product.set(input);
  await product.save();
  await product.populate("category");

  res.json({ product: serializeProduct(product, { admin: true }) });
});

/**
 * DELETE /api/admin/products/:id
 * Moves the product to "deleted", where it can be restored for 30 days.
 * Owners can add ?permanent=true to remove it for good.
 */
adminRouter.delete("/products/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, "Product not found");

  if (req.query.permanent === "true") {
    requireOwner(res.locals.user?.role);
    await product.deleteOne();
  } else if (!product.deletedAt) {
    product.deletedAt = new Date();
    await product.save();
  }

  res.status(204).end();
});

/** POST /api/admin/products/:id/restore  Brings a deleted product back. */
adminRouter.post("/products/:id/restore", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, "Product not found");

  product.deletedAt = null;
  await product.save();
  await product.populate("category");

  res.json({ product: serializeProduct(product, { admin: true }) });
});

// -------------------------------------------------------------- Categories

/** GET /api/admin/categories  All categories, hidden ones included. */
adminRouter.get("/categories", async (_req, res) => {
  const categories = await Category.find().sort({ order: 1, "name.en": 1 });
  res.json({ items: categories.map(serializeCategory) });
});

/** POST /api/admin/categories  Only `name` is required. */
adminRouter.post("/categories", async (req, res) => {
  const input = parse(categoryCreateSchema, req.body);
  if (input.parent) await assertCategoryExists(input.parent);

  const category = await Category.create({
    ...input,
    image: input.image ?? undefined,
    slug: await uniqueSlug(input.slug ?? slugify(input.name.en), async (slug) =>
      Boolean(await Category.exists({ slug })),
    ),
  });

  res.status(201).json({ category: serializeCategory(category) });
});

/** PATCH /api/admin/categories/:id */
adminRouter.patch("/categories/:id", async (req, res) => {
  const input = parse(categoryUpdateSchema, req.body);

  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, "Category not found");

  if (input.parent) {
    if (input.parent === category.id) throw new HttpError(400, "A category cannot be its own parent");
    await assertCategoryExists(input.parent);
  }
  if (input.slug && input.slug !== category.slug && (await Category.exists({ slug: input.slug }))) {
    throw new HttpError(409, "That slug is already in use", { fields: ["slug"] });
  }

  const { image, ...rest } = input;
  category.set(rest);
  if (image !== undefined) category.set("image", image ?? { url: "", publicId: "" });
  await category.save();

  res.json({ category: serializeCategory(category) });
});

/** DELETE /api/admin/categories/:id  Refused while products or sub-categories still use it. */
adminRouter.delete("/categories/:id", async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, "Category not found");

  const [products, children] = await Promise.all([
    Product.countDocuments({ category: category._id }),
    Category.countDocuments({ parent: category._id }),
  ]);
  if (products > 0 || children > 0) {
    throw new HttpError(409, "Move or delete this category's products and sub-categories first", {
      products,
      subCategories: children,
    });
  }

  await category.deleteOne();
  res.status(204).end();
});

// ------------------------------------------------------------------ Images

const upload = multer({
  storage: multer.memoryStorage(), // held in memory briefly, then sent to the image host
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, done) => {
    if (IMAGE_TYPES.includes(file.mimetype)) done(null, true);
    else done(new HttpError(400, "Upload a JPEG, PNG or WebP image"));
  },
});

/**
 * POST /api/admin/uploads  (multipart form, field name "image")
 * Returns { url, publicId } to store on a product or category.
 */
adminRouter.post("/uploads", upload.single("image"), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Attach an image in the "image" field');

  res.status(201).json({ image: await uploadImage(req.file.buffer) });
});

// ---------------------------------------------------------------- Settings

/** PUT /api/admin/settings  Owner only. Send only the fields that change. */
adminRouter.put("/settings", requireRole("owner"), async (req, res) => {
  const input = parse(settingsUpdateSchema, req.body);

  const settings = await getSettings();
  settings.set(input);
  await settings.save();

  res.json({ settings: serializeSettings(settings) });
});

// ----------------------------------------------------------------- Helpers

async function assertCategoryExists(id: string) {
  if (!(await Category.exists({ _id: id }))) {
    throw new HttpError(400, "That category does not exist", { fields: ["category"] });
  }
}

async function productSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  return Boolean(await Product.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }));
}

/** Makes a short product code such as "MG-48213" that no other product has. */
async function newProductCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `MG-${String(randomInt(0, 100_000)).padStart(5, "0")}`;
    if (!(await Product.exists({ code }))) return code;
  }
  throw new HttpError(500, "Could not create a product code. Please enter one.");
}

function requireOwner(role: unknown) {
  if (role !== "owner") throw new HttpError(403, "Only the owner can delete a product for good");
}
