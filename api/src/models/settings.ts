import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { localized } from "../lib/localized";

const bannerSchema = new Schema(
  {
    image: { type: String, default: "" },
    title: { en: { type: String, default: "" }, ta: { type: String, default: "" } },
    /** Where the banner goes when tapped, for example "/en/category/photo-frames". */
    link: { type: String, default: "" },
  },
  { _id: false },
);

/**
 * Shop-wide settings. There is only ever one document, with key "shop",
 * so the admin panel edits it and every page reads it.
 */
const settingsSchema = new Schema(
  {
    key: { type: String, default: "shop", unique: true },
    /** International format without "+" or spaces, as WhatsApp links need it: 9477XXXXXXX. */
    whatsappNumber: { type: String, default: "", trim: true },
    instagramUrl: { type: String, default: "https://www.instagram.com/mangalya_batti", trim: true },
    address: { en: { type: String, default: "" }, ta: { type: String, default: "" } },
    openingHours: { en: { type: String, default: "" }, ta: { type: String, default: "" } },
    banners: { type: [bannerSchema], default: [] },
    defaultLanguage: { type: String, enum: ["en", "ta"], default: "en" },
  },
  { timestamps: true },
);

export type SettingsFields = InferSchemaType<typeof settingsSchema>;
export type SettingsDoc = HydratedDocument<SettingsFields>;

export const Settings = model("Settings", settingsSchema);

/** Returns the shop settings, creating them with defaults the first time. */
export async function getSettings(): Promise<SettingsDoc> {
  const existing = await Settings.findOne({ key: "shop" });
  if (existing) return existing;

  try {
    return await Settings.create({ key: "shop" });
  } catch {
    // Two requests arrived at once and the other one created it first.
    return Settings.findOne({ key: "shop" }).orFail();
  }
}

export function serializeSettings(settings: SettingsDoc) {
  return {
    whatsappNumber: settings.whatsappNumber,
    instagramUrl: settings.instagramUrl,
    address: localized(settings.address),
    openingHours: localized(settings.openingHours),
    banners: settings.banners.map((banner) => ({
      image: banner.image,
      title: localized(banner.title),
      link: banner.link,
    })),
    defaultLanguage: settings.defaultLanguage,
  };
}
