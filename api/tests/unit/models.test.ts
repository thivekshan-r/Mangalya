import { Category, serializeCategory } from "../../src/models/category";
import { Enquiry } from "../../src/models/enquiry";
import { Product, serializeProduct } from "../../src/models/product";
import { Settings, serializeSettings } from "../../src/models/settings";
import { User, serializeUser } from "../../src/models/user";

// These tests build documents in memory and check the models' own rules.
// Nothing is saved, so no database is needed.

/** Names of the fields that fail the model's rules (empty when the document is valid). */
async function invalidFields(document: { validate(): Promise<unknown> }): Promise<string[]> {
  try {
    await document.validate();
    return [];
  } catch (error) {
    return Object.keys((error as { errors?: Record<string, unknown> }).errors ?? {}).sort();
  }
}

describe("Product model", () => {
  const category = new Category({ slug: "photo-frames", name: { en: "Photo frames", ta: "சட்டங்கள்" } });

  it("fills in sensible defaults", async () => {
    const product = new Product({ code: "fr-1", slug: "Teak-Frame", name: { en: " Teak frame " }, category: category._id });

    expect(await invalidFields(product)).toEqual([]);
    expect(product.code).toBe("FR-1");
    expect(product.slug).toBe("teak-frame");
    expect(product.name?.en).toBe("Teak frame");
    expect(product.price).toBeNull();
    expect(product.inStock).toBe(true);
    expect(product.visible).toBe(true);
    expect(product.featured).toBe(false);
    expect(product.deletedAt).toBeNull();
  });

  it("requires a code, slug, English name and category, and a price of zero or more", async () => {
    expect(await invalidFields(new Product({ price: -1 }))).toEqual(["category", "code", "name.en", "price", "slug"]);
  });

  it("serializes for the public site without admin fields", () => {
    const product = new Product({
      code: "FR-1",
      slug: "teak-frame",
      name: { en: "Teak frame" },
      category,
      price: 2500,
      options: [{ name: "Size", values: ["8 × 10"] }],
      images: [{ url: "https://img.example/1.jpg", publicId: "abc", alt: "Front" }],
    });

    expect(serializeProduct(product)).toEqual({
      id: product.id,
      code: "FR-1",
      slug: "teak-frame",
      name: { en: "Teak frame", ta: "" },
      description: { en: "", ta: "" },
      category: { id: category.id, slug: "photo-frames", name: { en: "Photo frames", ta: "சட்டங்கள்" } },
      tags: [],
      price: 2500,
      options: [{ name: "Size", values: ["8 × 10"] }],
      images: [{ url: "https://img.example/1.jpg", alt: "Front" }],
      inStock: true,
      featured: false,
    });
  });

  it("adds admin fields when asked", () => {
    const product = new Product({
      code: "FR-1",
      slug: "teak-frame",
      name: { en: "Teak frame" },
      category: category._id,
      images: [{ url: "https://img.example/1.jpg", publicId: "abc" }],
      visible: false,
    });
    product.createdAt = new Date("2026-01-02T03:04:05Z");
    product.updatedAt = new Date("2026-01-02T03:04:05Z");

    const result = serializeProduct(product, { admin: true });

    expect(result).toMatchObject({
      visible: false,
      deletedAt: null,
      createdAt: "2026-01-02T03:04:05.000Z",
      category: { id: category.id },
      images: [{ url: "https://img.example/1.jpg", alt: "", publicId: "abc" }],
    });
  });
});

describe("other models", () => {
  it("Category: requires a slug and English name", async () => {
    expect(await invalidFields(new Category({}))).toEqual(["name.en", "slug"]);

    const category = new Category({ slug: "gifts", name: { en: "Gifts" } });
    expect(serializeCategory(category)).toEqual({
      id: category.id,
      slug: "gifts",
      name: { en: "Gifts", ta: "" },
      parent: null,
      image: null,
      order: 0,
      visible: true,
    });
  });

  it("User: lowercases the email, defaults to staff, and never serializes the password hash", async () => {
    const user = new User({ name: "Asha", email: " Asha@Shop.LK ", passwordHash: "hash" });

    expect(await invalidFields(user)).toEqual([]);
    expect(user.role).toBe("staff");
    expect(serializeUser(user)).toEqual({ id: user.id, name: "Asha", email: "asha@shop.lk", role: "staff" });
    expect(await invalidFields(new User({ name: "A", email: "a@b.lk", passwordHash: "h", role: "admin" }))).toEqual(["role"]);
  });

  it("Settings: starts with the shop's Instagram page and English", () => {
    const settings = new Settings({});

    expect(serializeSettings(settings)).toEqual({
      whatsappNumber: "",
      instagramUrl: "https://www.instagram.com/mangalya_batti",
      address: { en: "", ta: "" },
      openingHours: { en: "", ta: "" },
      banners: [],
      defaultLanguage: "en",
    });
  });

  it("Enquiry: requires a name and phone, and starts as new", async () => {
    expect(await invalidFields(new Enquiry({}))).toEqual(["name", "phone"]);
    expect(new Enquiry({ name: "A", phone: "077" }).status).toBe("new");
  });
});
