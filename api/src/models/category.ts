import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { localized } from "../lib/localized";

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: {
      en: { type: String, required: true, trim: true },
      ta: { type: String, default: "", trim: true },
    },
    /** A category can sit inside another one, for example "Wedding frames" inside "Photo frames". */
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    /** Lower numbers appear first. */
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CategoryFields = InferSchemaType<typeof categorySchema>;
export type CategoryDoc = HydratedDocument<CategoryFields>;

export const Category = model("Category", categorySchema);

export function serializeCategory(category: CategoryDoc) {
  return {
    id: category.id as string,
    slug: category.slug,
    name: localized(category.name),
    parent: category.parent ? String(category.parent) : null,
    image: category.image?.url ? { url: category.image.url, publicId: category.image.publicId } : null,
    order: category.order,
    visible: category.visible,
  };
}
