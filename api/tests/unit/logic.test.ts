import { buildProductFilter, buildProductSort, pageInfo } from "../../src/lib/productQuery";
import { escapeRegex, slugify, uniqueSlug } from "../../src/lib/slug";
import { parse } from "../../src/lib/validate";
import { HttpError } from "../../src/middleware/errors";
import {
  enquiryCreateSchema,
  loginSchema,
  passwordChangeSchema,
  productCreateSchema,
  productListQuerySchema,
  productUpdateSchema,
  settingsUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
} from "../../src/schemas";

const CATEGORY = "0123456789abcdef01234567";

describe("slugify", () => {
  it.each([
    ["Wooden Wedding Frame 12×18", "wooden-wedding-frame-12x18"],
    ["  Gifts & Ornaments!  ", "gifts-and-ornaments"],
    ["Café frame", "cafe-frame"],
    ["---", ""],
    ["தமிழ்", ""],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("keeps slugs to 80 characters without a trailing dash", () => {
    const slug = slugify(`${"a".repeat(79)} b c`);

    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("returns the base when free, otherwise the next free number", async () => {
    const taken = new Set(["lamp", "lamp-2"]);
    const isTaken = async (slug: string) => taken.has(slug);

    expect(await uniqueSlug("frame", isTaken)).toBe("frame");
    expect(await uniqueSlug("lamp", isTaken)).toBe("lamp-3");
    expect(await uniqueSlug("", isTaken)).toBe("item");
  });
});

describe("escapeRegex", () => {
  it("makes search text match literally", () => {
    expect(new RegExp(escapeRegex("(.*")).test("frame")).toBe(false);
    expect(new RegExp(escapeRegex("12x18 (gold)")).test("frame 12x18 (gold)")).toBe(true);
  });
});

describe("product list query", () => {
  it("applies defaults and limits", () => {
    expect(productListQuerySchema.parse({})).toMatchObject({ sort: "newest", page: 1, limit: 12 });
    expect(productListQuerySchema.safeParse({ limit: "49" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ sort: "random" }).success).toBe(false);
  });

  it("turns query strings into typed values", () => {
    const query = productListQuerySchema.parse({ featured: "true", inStock: "false", minPrice: "100", page: "2" });

    expect(query).toMatchObject({ featured: true, inStock: false, minPrice: 100, page: 2 });
  });

  it("builds a MongoDB filter from the query", () => {
    const query = productListQuerySchema.parse({ tag: "Wedding", inStock: "true", minPrice: "100", maxPrice: "500" });

    expect(buildProductFilter(query, ["c1", "c2"])).toEqual({
      category: { $in: ["c1", "c2"] },
      tags: "wedding",
      inStock: true,
      price: { $gte: 100, $lte: 500 },
    });
    expect(buildProductFilter(productListQuerySchema.parse({}))).toEqual({});
  });

  it("searches names, code and tags without treating the text as a pattern", () => {
    const filter = buildProductFilter(productListQuerySchema.parse({ q: "a.b" }));
    const conditions = filter.$or as Record<string, RegExp>[];

    expect(conditions.map((condition) => Object.keys(condition)[0])).toEqual(["name.en", "name.ta", "code", "tags"]);
    const pattern = Object.values(conditions[0] ?? {})[0] as RegExp;
    expect(pattern.test("A.B frame")).toBe(true);
    expect(pattern.test("axb frame")).toBe(false);
  });

  it("sorts and pages", () => {
    expect(buildProductSort("price_asc")).toEqual({ price: 1, createdAt: -1 });
    expect(buildProductSort("newest")).toEqual({ createdAt: -1 });
    expect(pageInfo(25, 2, 12)).toEqual({ page: 2, limit: 12, total: 25, pages: 3 });
    expect(pageInfo(0, 1, 12)).toEqual({ page: 1, limit: 12, total: 0, pages: 1 });
  });
});

describe("product input", () => {
  it("needs only a name and category to create", () => {
    const result = productCreateSchema.parse({ name: { en: " Frame " }, category: CATEGORY });

    expect(result).toEqual({ name: { en: "Frame", ta: "" }, category: CATEGORY });
  });

  it("tidies codes, tags and slugs", () => {
    const result = productCreateSchema.parse({
      name: { en: "Frame" },
      category: CATEGORY,
      code: " fr-12 ",
      tags: [" Wedding "],
      slug: "My-Frame",
    });

    expect(result).toMatchObject({ code: "FR-12", tags: ["wedding"], slug: "my-frame" });
  });

  it.each([
    [{ category: CATEGORY }, "name"],
    [{ name: { en: "Frame" } }, "category"],
    [{ name: { en: "Frame" }, category: "abc" }, "category"],
    [{ name: { en: "Frame" }, category: CATEGORY, price: -1 }, "price"],
    [{ name: { en: "Frame" }, category: CATEGORY, slug: "has spaces" }, "slug"],
    [{ name: { en: "Frame" }, category: CATEGORY, images: [{ url: "not a url" }] }, "images.0.url"],
    [{ name: { en: "Frame" }, category: CATEGORY, options: [{ name: "Size", values: [] }] }, "options.0.values"],
  ])("rejects %j", (input, field) => {
    const result = productCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(field);
  });

  it("adds no fields to an update that were not sent", () => {
    expect(productUpdateSchema.parse({})).toEqual({});
    expect(productUpdateSchema.parse({ price: null })).toEqual({ price: null });
    expect(productUpdateSchema.parse({ inStock: false })).toEqual({ inStock: false });
  });
});

describe("other input", () => {
  it("normalises the login email", () => {
    expect(loginSchema.parse({ email: " Owner@Shop.LK ", password: "x" }).email).toBe("owner@shop.lk");
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.lk", password: "" }).success).toBe(false);
  });

  it("accepts WhatsApp numbers in digits only", () => {
    expect(settingsUpdateSchema.safeParse({ whatsappNumber: "94770000000" }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ whatsappNumber: "" }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ whatsappNumber: "+94 77 000 0000" }).success).toBe(false);
  });
});

describe("enquiry input", () => {
  it("needs only a name and phone number, and fills in the rest", () => {
    expect(enquiryCreateSchema.parse({ name: " Asha ", phone: "+94 77 123 4567" })).toEqual({
      type: "wholesale",
      name: "Asha",
      businessName: "",
      town: "",
      phone: "+94 77 123 4567",
      items: [],
      message: "",
    });
  });

  it("reads quantities typed as text and defaults to one", () => {
    const result = enquiryCreateSchema.parse({
      name: "Asha",
      phone: "0771234567",
      items: [{ description: "Frame", quantity: "12" }, { description: "Lamp" }],
    });

    expect(result.items).toEqual([
      { product: null, description: "Frame", quantity: 12 },
      { product: null, description: "Lamp", quantity: 1 },
    ]);
  });

  it.each([
    [{ phone: "0771234567" }, "name"],
    [{ name: "Asha", phone: "call me" }, "phone"],
    [{ name: "Asha", phone: "0771234567", items: [{ description: "", quantity: 1 }] }, "items.0.description"],
    [{ name: "Asha", phone: "0771234567", items: [{ description: "Frame", quantity: 0 }] }, "items.0.quantity"],
    [{ name: "Asha", phone: "0771234567", message: "x".repeat(2001) }, "message"],
  ])("rejects %j", (input, field) => {
    const result = enquiryCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(field);
  });
});

describe("account input", () => {
  it("needs a password of ten characters or more for new accounts and password changes", () => {
    const account = { name: "Kumar", email: " Kumar@Shop.LK " };

    expect(userCreateSchema.safeParse({ ...account, password: "nine-char" }).success).toBe(false);
    expect(userCreateSchema.parse({ ...account, password: "ten-chars!" })).toEqual({
      name: "Kumar",
      email: "kumar@shop.lk",
      password: "ten-chars!",
    });
    expect(passwordChangeSchema.safeParse({ currentPassword: "old", newPassword: "short" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ currentPassword: "old", newPassword: "long-enough-now" }).success).toBe(true);
  });

  it("changes only what is sent when updating an account", () => {
    expect(userUpdateSchema.parse({})).toEqual({});
    expect(userUpdateSchema.parse({ active: false })).toEqual({ active: false });
    expect(userUpdateSchema.safeParse({ password: "short" }).success).toBe(false);
  });
});

describe("parse", () => {
  it("throws a 400 that lists the wrong fields", () => {
    expect.assertions(3);
    try {
      parse(loginSchema, { email: "nope" });
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).details).toEqual({
        fields: expect.arrayContaining([expect.objectContaining({ field: "email" }), expect.objectContaining({ field: "password" })]),
      });
    }
  });
});
