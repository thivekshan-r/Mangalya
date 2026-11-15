import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export const ROLES = ["owner", "staff"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** Never the password itself. `select: false` keeps it out of normal queries. */
    passwordHash: { type: String, required: true, select: false },
    /** owner: everything. staff: products and categories only. */
    role: { type: String, enum: ROLES, default: "staff", required: true },
    /** Switch off to block a login without deleting the account. */
    active: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserFields = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserFields>;

export const User = model("User", userSchema);

/** The shape of a user in API responses. The password hash is never included. */
export function serializeUser(user: UserDoc) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  };
}
