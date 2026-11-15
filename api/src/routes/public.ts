import { Router } from "express";
import { buildProductFilter, buildProductSort, pageInfo } from "../lib/productQuery";
import { parse } from "../lib/validate";
import { HttpError } from "../middleware/errors";
import { Category, serializeCategory } from "../models/category";
import { Product, serializeProduct } from "../models/product";
import { getSettings, serializeSettings } from "../models/settings";
import { productListQuerySchema } from "../schemas";

/** What every visitor is allowed to see: live products only. */
const LIVE = { visible: true, deletedAt: null };

/**
 * The read-only endpoints the customer site uses. No login needed.
 */
export const publicRouter = Router();

/**
 * GET /api/products?category=photo-frames&q=wedding&sort=price_asc&page=1&limit=12
 * Also: tag, featured=true, inStock=true, minPrice, maxPrice.
 */
publicRouter.get("/products", async (req, res) => {
  const query = parse(productListQuerySchema, req.query);

  let categoryIds: unknown[] | undefined;
  if (query.category) {
    const category = await Category.findOne({ slug: query.category, visible: true });
    if (!category) {
      res.json({ items: [], ...pageInfo(0, query.page, query.limit) });
      return;
    }
    // A category page also shows the products of its sub-categories.
    const children = await Category.find({ parent: category._id, visible: true }).select("_id");
    categoryIds = [category._id, ...children.map((child) => child._id)];
  }

  const filter = { ...buildProductFilter(query, categoryIds), ...LIVE };

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(buildProductSort(query.sort))
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate("category"),
    Product.countDocuments(filter),
  ]);

  res.json({
    items: items.map((product) => serializeProduct(product)),
    ...pageInfo(total, query.page, query.limit),
  });
});

/** GET /api/products/wooden-wedding-frame  One product, plus up to four related ones. */
publicRouter.get("/products/:slug", async (req, res) => {
  const product = await Product.findOne({ slug: String(req.params.slug).toLowerCase(), ...LIVE });
  if (!product) throw new HttpError(404, "Product not found");

  // Other live products from the same category.
  const related = await Product.find({ category: product.category, _id: { $ne: product._id }, ...LIVE })
    .sort({ featured: -1, createdAt: -1 })
    .limit(4)
    .populate("category");

  await product.populate("category");

  res.json({
    product: serializeProduct(product),
    related: related.map((item) => serializeProduct(item)),
  });
});

/** GET /api/categories  Visible categories, in menu order. */
publicRouter.get("/categories", async (_req, res) => {
  const categories = await Category.find({ visible: true }).sort({ order: 1, "name.en": 1 });
  res.json({ items: categories.map(serializeCategory) });
});

/** GET /api/settings  WhatsApp number, Instagram link, address, banners. */
publicRouter.get("/settings", async (_req, res) => {
  res.json({ settings: serializeSettings(await getSettings()) });
});
