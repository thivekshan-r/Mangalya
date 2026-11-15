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

/** A wholesale or general enquiry sent from the website's form. */
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

/** The shape of an enquiry in the admin panel. */
export function serializeEnquiry(enquiry: EnquiryDoc) {
  return {
    id: enquiry.id as string,
    type: enquiry.type,
    name: enquiry.name,
    businessName: enquiry.businessName,
    town: enquiry.town,
    phone: enquiry.phone,
    items: enquiry.items.map((item) => ({
      product: item.product ? String(item.product) : null,
      description: item.description,
      quantity: item.quantity,
    })),
    message: enquiry.message,
    status: enquiry.status,
    createdAt: enquiry.createdAt.toISOString(),
  };
}
