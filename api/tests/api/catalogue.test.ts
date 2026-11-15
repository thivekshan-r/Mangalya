import request from "supertest";
import { createApp } from "../../src/app";
import { Category } from "../../src/models/category";
import { Product } from "../../src/models/product";
import { createCategory, loginAs, useTestDatabase } from "../helpers/db";

/** Adds a small catalogue straight into the database. */
async function seedCatalogue() {
  const frames = await createCategory("Photo frames", "photo-frames");
  const wedding = await Category.create({ slug: "wedding-frames", name: { en: "Wedding frames", ta: "" }, parent: frames._id });
  const gifts = await createCategory("Gift items", "gift-items");

  const base = { description: { en: "", ta: "" } };
  await Product.create([
    { ...base, code: "A1", slug: "teak-frame", name: { en: "Teak frame", ta: "தேக்கு சட்டம்" }, category: frames._id, price: 3000, tags: ["wood"], featured: true },
    { ...base, code: "A2", slug: "gold-frame", name: { en: "Gold frame", ta: "" }, category: wedding._id, price: 1500, tags: ["wedding"] },
    { ...base, code: "A3", slug: "mug", name: { en: "Photo mug", ta: "" }, category: gifts._id, price: 800, inStock: false },
    { ...base, code: "A4", slug: "hidden-frame", name: { en: "Hidden frame", ta: "" }, category: frames._id, price: 100, visible: false },
    { ...base, code: "A5", slug: "deleted-frame", name: { en: "Deleted frame", ta: "" }, category: frames._id, price: 100, deletedAt: new Date() },
  ]);

  return { frames, wedding, gifts };
}

const slugs = (body: { items: { slug: string }[] }) => body.items.map((item) => item.slug).sort();

describe("public catalogue", () => {
  useTestDatabase();

  it("lists live products only, never hidden or deleted ones, and no admin fields", async () => {
    const app = createApp();
    await seedCatalogue();

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(slugs(response.body)).toEqual(["gold-frame", "mug", "teak-frame"]);
    expect(response.body.total).toBe(3);
    expect(response.body.items[0]).not.toHaveProperty("visible");
    expect(response.body.items[0]).not.toHaveProperty("deletedAt");
  });

  it("filters by category, including its sub-categories", async () => {
    const app = createApp();
    await seedCatalogue();

    expect(slugs((await request(app).get("/api/products?category=photo-frames")).body)).toEqual(["gold-frame", "teak-frame"]);
    expect(slugs((await request(app).get("/api/products?category=wedding-frames")).body)).toEqual(["gold-frame"]);
    expect((await request(app).get("/api/products?category=no-such-category")).body.items).toEqual([]);
  });

  it("searches names in English and Tamil, and product codes", async () => {
    const app = createApp();
    await seedCatalogue();

    expect(slugs((await request(app).get("/api/products?q=FRAME")).body)).toEqual(["gold-frame", "teak-frame"]);
    expect(slugs((await request(app).get(`/api/products?q=${encodeURIComponent("தேக்கு")}`)).body)).toEqual(["teak-frame"]);
    expect(slugs((await request(app).get("/api/products?q=a3")).body)).toEqual(["mug"]);
    // Special characters are searched for literally instead of breaking the query.
    expect((await request(app).get(`/api/products?q=${encodeURIComponent("(.*")}`)).status).toBe(200);
  });

  it("filters by tag, stock, featured and price, and sorts by price", async () => {
    const app = createApp();
    await seedCatalogue();

    expect(slugs((await request(app).get("/api/products?tag=wedding")).body)).toEqual(["gold-frame"]);
    expect(slugs((await request(app).get("/api/products?inStock=true")).body)).toEqual(["gold-frame", "teak-frame"]);
    expect(slugs((await request(app).get("/api/products?featured=true")).body)).toEqual(["teak-frame"]);
    expect(slugs((await request(app).get("/api/products?minPrice=1000&maxPrice=2000")).body)).toEqual(["gold-frame"]);

    const sorted = await request(app).get("/api/products?sort=price_asc");
    expect(sorted.body.items.map((item: { slug: string }) => item.slug)).toEqual(["mug", "gold-frame", "teak-frame"]);
  });

  it("pages through results", async () => {
    const app = createApp();
    await seedCatalogue();

    const first = await request(app).get("/api/products?limit=2&page=1&sort=name");
    const second = await request(app).get("/api/products?limit=2&page=2&sort=name");

    expect(first.body).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2 });
    expect(first.body.items).toHaveLength(2);
    expect(second.body.items).toHaveLength(1);
    expect((await request(app).get("/api/products?limit=500")).status).toBe(400);
  });

  it("shows one product by slug with related products, and 404s for hidden ones", async () => {
    const app = createApp();
    await seedCatalogue();

    const response = await request(app).get("/api/products/teak-frame");
    expect(response.status).toBe(200);
    expect(response.body.product.code).toBe("A1");
    expect(response.body.product.category.slug).toBe("photo-frames");
    expect(response.body.related.map((item: { slug: string }) => item.slug)).toEqual([]);

    expect((await request(app).get("/api/products/hidden-frame")).status).toBe(404);
    expect((await request(app).get("/api/products/deleted-frame")).status).toBe(404);
    expect((await request(app).get("/api/products/nope")).status).toBe(404);
  });

  it("lists visible categories in order", async () => {
    const app = createApp();
    await Category.create([
      { slug: "b", name: { en: "B" }, order: 2 },
      { slug: "a", name: { en: "A" }, order: 1 },
      { slug: "hidden", name: { en: "Hidden" }, order: 0, visible: false },
    ]);

    const response = await request(app).get("/api/categories");

    expect(response.body.items.map((item: { slug: string }) => item.slug)).toEqual(["a", "b"]);
  });
});

describe("admin categories", () => {
  useTestDatabase();

  it("creates, renames and deletes a category", async () => {
    const app = createApp();
    const { agent } = await loginAs(app, "staff");

    const created = await agent.post("/api/admin/categories").send({ name: { en: "Christian ornaments" } });
    expect(created.status).toBe(201);
    expect(created.body.category.slug).toBe("christian-ornaments");
    const id = created.body.category.id;

    const renamed = await agent.patch(`/api/admin/categories/${id}`).send({ name: { en: "Christian gifts" }, order: 3 });
    expect(renamed.body.category.name.en).toBe("Christian gifts");
    expect(renamed.body.category.slug).toBe("christian-ornaments");
    expect(renamed.body.category.order).toBe(3);

    expect((await agent.delete(`/api/admin/categories/${id}`)).status).toBe(204);
    expect(await Category.countDocuments()).toBe(0);
  });

  it("refuses to delete a category that still has products", async () => {
    const app = createApp();
    const { agent } = await loginAs(app);
    const category = await createCategory();
    await agent.post("/api/admin/products").send({ name: { en: "Frame" }, category: category.id });

    const response = await agent.delete(`/api/admin/categories/${category.id}`);

    expect(response.status).toBe(409);
    expect(response.body.details.products).toBe(1);
  });
});

describe("shop settings", () => {
  useTestDatabase();

  it("is readable by everyone with sensible defaults", async () => {
    const app = createApp();

    const response = await request(app).get("/api/settings");

    expect(response.status).toBe(200);
    expect(response.body.settings.instagramUrl).toBe("https://www.instagram.com/mangalya_batti");
    expect(response.body.settings.defaultLanguage).toBe("en");
  });

  it("can be changed by the owner but not by staff", async () => {
    const app = createApp();
    const staff = await loginAs(app, "staff");
    const owner = await loginAs(app, "owner");
    const change = { whatsappNumber: "94770000000", address: { en: "Main Street", ta: "" } };

    expect((await staff.agent.put("/api/admin/settings").send(change)).status).toBe(403);

    const response = await owner.agent.put("/api/admin/settings").send(change);
    expect(response.status).toBe(200);
    expect(response.body.settings.whatsappNumber).toBe("94770000000");
    // Fields that were not sent keep their values.
    expect(response.body.settings.instagramUrl).toBe("https://www.instagram.com/mangalya_batti");

    expect((await owner.agent.put("/api/admin/settings").send({ whatsappNumber: "+94 77" })).status).toBe(400);
  });
});
