import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export const ENQUIRY_STATUSES = ["new", "replied", "closed"] as const;

const enquiryItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    /** Kept as text too, so the enquiry still reads correctly if the product is later deleted. */
    description: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false },
);

/**
 * A wholesale or general enquiry sent from the website.
 * The model is defined now; the form and its endpoints arrive in Step 6.
 */
const enquirySchema = new Schema(
  {
    type: { type: String, enum: ["wholesale", "general"], default: "wholesale" },
    name: { type: String, required: true, trim: true },
    businessName: { type: String, default: "", trim: true },
    town: { type: String, default: "", trim: true },
    phone: { type: String, required: true, trim: true },
    items: { type: [enquiryItemSchema], default: [] },
    message: { type: String, default: "", trim: true },
    status: { type: String, enum: ENQUIRY_STATUSES, default: "new", index: true },
  },
  { timestamps: true },
);

export type EnquiryFields = InferSchemaType<typeof enquirySchema>;
export type EnquiryDoc = HydratedDocument<EnquiryFields>;

export const Enquiry = model("Enquiry", enquirySchema);
