import "dotenv/config";
import { randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * Every environment variable the API uses is declared and checked here.
 * The rest of the code imports `env` instead of reading `process.env`,
 * so a missing or mistyped value fails loudly at start-up, not at 2am.
 */
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    MONGODB_URI: optionalText,
    WEB_ORIGIN: z.string().trim().min(1).default("http://localhost:3000"),

    // Login
    JWT_SECRET: optionalText,
    SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(7),

    // Image uploads (Cloudinary). Optional: uploads are switched off without them.
    CLOUDINARY_CLOUD_NAME: optionalText,
    CLOUDINARY_API_KEY: optionalText,
    CLOUDINARY_API_SECRET: optionalText,
  })
  .refine((value) => value.NODE_ENV !== "production" || Boolean(value.MONGODB_URI), {
    path: ["MONGODB_URI"],
    message: "MONGODB_URI is required in production",
  })
  .refine((value) => value.NODE_ENV !== "production" || (value.JWT_SECRET ?? "").length >= 32, {
    path: ["JWT_SECRET"],
    message: "JWT_SECRET is required in production and must be at least 32 characters",
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(env)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${problems}\nCheck your .env file against .env.example.`);
}

const data = parsed.data;

// Without a JWT_SECRET in development, make a random one for this run.
// Logins then stop working when the API restarts, which is a nudge to set a real one.
let jwtSecret = data.JWT_SECRET;
if (!jwtSecret) {
  jwtSecret = randomBytes(48).toString("hex");
  if (data.NODE_ENV === "development") {
    console.warn("JWT_SECRET is not set. Using a temporary one: logins reset when the API restarts.");
  }
}

const cloudinary =
  data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET
    ? {
        cloudName: data.CLOUDINARY_CLOUD_NAME,
        apiKey: data.CLOUDINARY_API_KEY,
        apiSecret: data.CLOUDINARY_API_SECRET,
      }
    : null;

export const env = {
  nodeEnv: data.NODE_ENV,
  isProduction: data.NODE_ENV === "production",
  port: data.PORT,
  mongodbUri: data.MONGODB_URI,
  /** Sites allowed to call the API from a browser. */
  webOrigins: data.WEB_ORIGIN.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  jwtSecret,
  sessionDays: data.SESSION_DAYS,
  /** null when image uploads are not configured. */
  cloudinary,
};
