import request from "supertest";
import { createApp } from "../../src/app";
import { Product } from "../../src/models/product";
import { createCategory, loginAs, useTestDatabase } from "../helpers/db";

describe("admin products", () => {
  useTestDatabase();

  it("requires a login", async () => {
    const app = createApp();

    expect((await request(app).get("/api/admin/products")).status).toBe(401);
    expect((await request(app).post("/api/admin/products").send({})).status).toBe(401);
  });

  it("creates a product with only a name and category, filling in code and slug", async () => {
    const app = createApp();
    const { agent } = await loginAs(app, "staff");
    const category = await createCategory();

    const response = await agent
      .post("/api/admin/products")
      .send({ name: { en: "Wooden Wedding Frame 12×18" }, category: category.id });

    expect(response.status).toBe(201);
    const product = response.body.product;
    expect(product.slug).toBe("wooden-wedding-frame-12x18");
    expect(product.code).toMatch(/^MG-\d{5}$/);
    expect(product.name).toEqual({ en: "Wooden Wedding Frame 12×18", ta: "" });
    expect(product.category).toEqual({ id: category.id, slug: "photo-frames", name: { en: "Photo frames", ta: "" } });
    expect(product.price).toBeNull();
    expect(product.inStock).toBe(true);
    expect(product.visible).toBe(true);
    expect(product.deletedAt).toBeNull();
  });

  it("gives a second product with the same name a different slug", async () => {
    const app = createApp();
    const { agent } = await loginAs(app);
    const category = await createCategory();
    const body = { name: { en: "Brass lamp" }, category: category.id };

    const first = await agent.post("/api/admin/products").send(body);
    const second = await agent.post("/api/admin/products").send(body);

    expect(first.body.product.slug).toBe("brass-lamp");
    expect(second.body.product.slug).toBe("brass-lamp-2");
  });

  it("refuses bad input and says which fields are wrong", async () => {
    const app = createApp();
    const { agent } = await loginAs(app);
    const category = await createCategory();

    const response = await agent
      .post("/api/admin/products")
      .send({ name: { en: "" }, category: category.id, price: -5 });

    expect(response.status).toBe(400);
    const fields = response.body.details.fields.map((entry: { field: string }) => entry.field);
    expect(fields).toEqual(expect.arrayContaining(["name.en", "price"]));
    expect(await Product.countDocuments()).toBe(0);
  });

  it("refuses a category that does not exist and a product code that is taken", async () => {
    const app = createApp();
    const { agent } = await loginAs(app);
    const category = await createCategory();

    const noCategory = await agent
      .post("/api/admin/products")
      .send({ name: { en: "Frame" }, category: "0123456789abcdef01234567" });
    expect(noCategory.status).toBe(400);

    const body = { name: { en: "Frame" }, category: category.id, code: "FR-1" };
    expect((await agent.post("/api/admin/products").send(body)).status).toBe(201);
    expect((await agent.post("/api/admin/products").send(body)).status).toBe(409);
  });

  it("updates only the fields that are sent and keeps the slug when the name changes", async () => {
    const app = createApp();
    const { agent } = await loginAs(app);
    const category = await createCategory();
    const created = await agent
      .post("/api/admin/products")
      .send({ name: { en: "Teak frame", ta: "தேக்கு" }, category: category.id, price: 2500, tags: ["wedding"] });
    const id = created.body.product.id;

    const response = await agent
      .patch(`/api/admin/products/${id}`)
      .send({ name: { en: "Carved teak frame", ta: "தேக்கு" }, price: null, inStock: false });

    expect(response.status).toBe(200);
    expect(response.body.product.name.en).toBe("Carved teak frame");
    expect(response.body.product.slug).toBe("teak-frame");
    expect(response.body.product.price).toBeNull();
    expect(response.body.product.inStock).toBe(false);
    expect(response.body.product.tags).toEqual(["wedding"]);
  });

  it("responds 404 for an unknown product and 400 for a malformed id", async () => {
    const app = createApp();
    const { agent } = await loginAs(app);

    expect((await agent.get("/api/admin/products/0123456789abcdef01234567")).status).toBe(404);
    expect((await agent.get("/api/admin/products/not-an-id")).status).toBe(400);
  });

  it("deletes softly, lists the product under deleted, and restores it", async () => {
    const app = createApp();
    const { agent } = await loginAs(app, "staff");
    const category = await createCategory();
    const created = await agent.post("/api/admin/products").send({ name: { en: "Frame" }, category: category.id });
    const id = created.body.product.id;

    expect((await agent.delete(`/api/admin/products/${id}`)).status).toBe(204);

    const live = await agent.get("/api/admin/products");
    const deleted = await agent.get("/api/admin/products?status=deleted");
    expect(live.body.total).toBe(0);
    expect(deleted.body.total).toBe(1);
    expect(deleted.body.items[0].deletedAt).not.toBeNull();

    // A deleted product cannot be edited until it is restored.
    expect((await agent.patch(`/api/admin/products/${id}`).send({ featured: true })).status).toBe(404);

    const restored = await agent.post(`/api/admin/products/${id}/restore`);
    expect(restored.status).toBe(200);
    expect(restored.body.product.deletedAt).toBeNull();
    expect((await agent.get("/api/admin/products")).body.total).toBe(1);
  });

  it("lets only the owner delete a product for good", async () => {
    const app = createApp();
    const staff = await loginAs(app, "staff");
    const owner = await loginAs(app, "owner");
    const category = await createCategory();
    const created = await staff.agent
      .post("/api/admin/products")
      .send({ name: { en: "Frame" }, category: category.id });
    const id = created.body.product.id;

    expect((await staff.agent.delete(`/api/admin/products/${id}?permanent=true`)).status).toBe(403);
    expect(await Product.countDocuments()).toBe(1);

    expect((await owner.agent.delete(`/api/admin/products/${id}?permanent=true`)).status).toBe(204);
    expect(await Product.countDocuments()).toBe(0);
  });
});
