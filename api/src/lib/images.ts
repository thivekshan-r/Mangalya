import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { HttpError } from "../middleware/errors";

/** File types the admin panel may upload. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

if (env.cloudinary) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export function uploadsConfigured(): boolean {
  return env.cloudinary !== null;
}

/**
 * Sends an image to Cloudinary and returns where it now lives.
 * Cloudinary resizes and compresses on the fly, so the original is stored once.
 */
export function uploadImage(file: Buffer, folder = "mangalya/products"): Promise<{ url: string; publicId: string }> {
  if (!uploadsConfigured()) {
    throw new HttpError(503, "Image uploads are not set up yet. Add the CLOUDINARY_ values to the API's .env file.");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
      if (error || !result) {
        reject(new HttpError(502, "The image host did not accept the upload. Please try again."));
        return;
      }
      resolve({ url: result.secure_url, publicId: result.public_id });
    });

    stream.end(file);
  });
}
