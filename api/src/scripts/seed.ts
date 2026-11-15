/**
 * Fills an empty database with what the site needs to start:
 * the owner account, the four main categories, shop settings and three sample products.
 *
 *   npm run seed
 *
 * Safe to run more than once: it adds what is missing and leaves the rest alone.
 * To change the owner's password, run:  npm run seed -- --reset-password
 */
import { connectDatabase, disconnectDatabase } from "../config/db";
import { hashPassword } from "../lib/auth";
import { Category } from "../models/category";
import { Product } from "../models/product";
import { getSettings } from "../models/settings";
import { User } from "../models/user";

const CATEGORIES = [
  { slug: "photo-frames", name: { en: "Photo frames", ta: "புகைப்படச் சட்டங்கள்" }, order: 1 },
  { slug: "gift-items", name: { en: "Gift items", ta: "பரிசுப் பொருட்கள்" }, order: 2 },
  { slug: "hindu-ornaments", name: { en: "Hindu ornaments", ta: "இந்து அலங்காரப் பொருட்கள்" }, order: 3 },
  { slug: "christian-ornaments", name: { en: "Christian ornaments", ta: "கிறிஸ்தவ அலங்காரப் பொருட்கள்" }, order: 4 },
];

// Samples so the site has something to show. They carry the tag "sample":
// delete them from the admin panel once real products are in.
const SAMPLE_PRODUCTS = [
  {
    code: "SAMPLE-1",
    slug: "sample-wooden-wedding-frame",
    name: { en: "Sample: Wooden wedding frame", ta: "" },
    category: "photo-frames",
    tags: ["sample", "wedding"],
    options: [
      { name: "Size", values: ["8 × 10", "10 × 12", "12 × 18"] },
      { name: "Frame colour", values: ["Gold", "Brown", "Black"] },
    ],
    featured: true,
  },
  {
    code: "SAMPLE-2",
    slug: "sample-gift-set",
    name: { en: "Sample: Gift set", ta: "" },
    category: "gift-items",
    tags: ["sample"],
    options: [],
    featured: false,
  },
  {
    code: "SAMPLE-3",
    slug: "sample-brass-oil-lamp",
    name: { en: "Sample: Brass oil lamp", ta: "" },
    category: "hindu-ornaments",
    tags: ["sample", "hindu"],
    options: [],
    featured: true,
  },
];

async function seedOwner() {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? "";
  const name = process.env.SEED_OWNER_NAME?.trim() || "Owner";

  if (!email || !password) {
    throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD in api/.env before seeding.");
  }
  if (password.length < 10) {
    throw new Error("SEED_OWNER_PASSWORD must be at least 10 characters.");
  }

  const existing = await User.findOne({ email });

  if (!existing) {
    await User.create({ name, email, passwordHash: await hashPassword(password), role: "owner" });
    console.log(`Owner account created: ${email}`);
  } else if (process.argv.includes("--reset-password")) {
    existing.passwordHash = await hashPassword(password);
    existing.role = "owner";
    existing.active = true;
    await existing.save();
    console.log(`Owner password reset: ${email}`);
  } else {
    console.log(`Owner account already exists: ${email} (unchanged)`);
  }
}

async function seedCatalogue() {
  let categoriesAdded = 0;
  for (const category of CATEGORIES) {
    if (await Category.exists({ slug: category.slug })) continue;

    await Category.create(category);
    categoriesAdded += 1;
  }
  console.log(`Categories added: ${categoriesAdded}`);

  let added = 0;
  for (const sample of SAMPLE_PRODUCTS) {
    if (await Product.exists({ code: sample.code })) continue;

    const category = await Category.findOne({ slug: sample.category }).orFail();
    await Product.create({ ...sample, category: category._id });
    added += 1;
  }
  console.log(`Sample products added: ${added}`);

  await getSettings();
  console.log("Shop settings ready");
}

async function main() {
  if (!(await connectDatabase())) {
    throw new Error("Could not connect to MongoDB. Check MONGODB_URI in api/.env.");
  }

  await seedOwner();
  await seedCatalogue();
}

main()
  .then(() => disconnectDatabase())
  .then(() => {
    console.log("Seed finished.");
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exit(1);
  });
