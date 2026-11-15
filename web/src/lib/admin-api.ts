import type { Category, Localized, Product, ProductList, Settings } from "./types";

/**
 * How the admin panel talks to the API. Requests go to the website's own
 * address (/api/...), which Next.js passes on to the Express API, so the
 * login cookie is sent automatically.
 */

export type AdminUser = { id: string; name: string; email: string; role: "owner" | "staff" };

/** A product as the admin panel sees it: with the fields customers never get. */
export type AdminProduct = Omit<Product, "images"> & {
  images: { url: string; alt: string; publicId: string }[];
  visible: boolean;
  deletedAt: string | null;
};

export type AdminProductList = Omit<ProductList, "items"> & { items: AdminProduct[] };

export type AdminCategory = Category & { visible: boolean };

export type EnquiryStatus = "new" | "replied" | "closed";

export type Enquiry = {
  id: string;
  type: "wholesale" | "general";
  name: string;
  businessName: string;
  town: string;
  phone: string;
  items: { product: string | null; description: string; quantity: number }[];
  message: string;
  status: EnquiryStatus;
  createdAt: string;
};

export type EnquiryList = { items: Enquiry[]; page: number; pages: number; total: number; waiting: number };

/** A login as the owner sees it in the staff list. */
export type Account = AdminUser & { active: boolean; lastLogin: string | null };

export type { Localized, Settings };

export type FieldError = { field: string; message: string };

/** An error answer from the API, with the form fields it complained about. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Sent as JSON. */
  body?: unknown;
  /** Sent as a form, for file uploads. */
  form?: FormData;
};

export async function api<T = void>(path: string, options: Options = {}): Promise<T> {
  const hasBody = options.body !== undefined || options.form !== undefined;
  let response: Response;

  try {
    response = await fetch(path, {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      credentials: "same-origin",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your internet connection and try again.");
  }

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);

  // The login has run out (or was never there): go to the login page with a full reload.
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload is intended here
    window.location.href = "/admin/login";
  }

  if (!response.ok) {
    const answer = (data ?? {}) as { error?: string; details?: { fields?: unknown } };
    const rawFields = Array.isArray(answer.details?.fields) ? answer.details.fields : [];
    const fields = rawFields.map((entry): FieldError =>
      typeof entry === "string"
        ? { field: entry, message: answer.error ?? "Not valid" }
        : (entry as FieldError),
    );

    throw new ApiError(
      response.status,
      answer.error ?? "The server is not responding. Check that the API is running, then try again.",
      fields,
    );
  }

  return data as T;
}

/** A readable message for any thrown value. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    const details = error.fields.map((entry) => `${entry.field}: ${entry.message}`).join("; ");
    return details ? `${error.message} (${details})` : error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Makes a photo smaller before it is uploaded: phone photos are often 5 to 10 MB,
 * which is slow on mobile data and more than the site needs.
 * Returns the original file if the browser cannot read it.
 */
export async function shrinkImage(file: File, maxSide = 1600): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Uploads one photo and returns where it is stored. */
export async function uploadPhoto(file: File): Promise<{ url: string; publicId: string }> {
  const form = new FormData();
  form.append("image", await shrinkImage(file), file.name.replace(/\.[^.]+$/, "") + ".jpg");

  const { image } = await api<{ image: { url: string; publicId: string } }>("/api/admin/uploads", { form });
  return image;
}
