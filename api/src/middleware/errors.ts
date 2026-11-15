import type { ErrorRequestHandler, RequestHandler } from "express";
import { env } from "../config/env";

/**
 * An error with an HTTP status, for routes to throw:
 * `throw new HttpError(404, "Product not found")`.
 * `details` is optional extra information, such as which form fields were wrong.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Runs when no route matched the request. */
export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
};

/**
 * The single place every error ends up. Express 5 sends errors thrown in
 * async route handlers here automatically.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next; // Express only treats this as an error handler if it has four parameters.

  const { status, message, details } = describe(error);

  // Log real failures. A 503 ("database not connected") is already reported at start-up.
  if (status >= 500 && status !== 503) {
    console.error(error);
  }

  res.status(status).json({
    // Never leak unexpected internal error details to visitors on the live site.
    // Messages we wrote ourselves (HttpError) are safe to show.
    error: status >= 500 && env.isProduction && !(error instanceof HttpError) ? "Something went wrong" : message,
    ...(details === undefined ? {} : { details }),
  });
};

function describe(error: unknown): { status: number; message: string; details?: unknown } {
  if (error instanceof HttpError) {
    return { status: error.status, message: error.message, details: error.details };
  }

  if (typeof error === "object" && error !== null) {
    const known = error as { name?: string; code?: unknown; status?: unknown; message?: string; keyValue?: unknown };

    // MongoDB: a unique field (email, slug, product code) already has this value.
    if (known.code === 11000) {
      const fields = known.keyValue && typeof known.keyValue === "object" ? Object.keys(known.keyValue) : [];
      return { status: 409, message: `That ${fields[0] ?? "value"} is already in use`, details: { fields } };
    }

    // Mongoose: an id in the address is not a valid MongoDB id.
    if (known.name === "CastError") {
      return { status: 400, message: "Invalid id" };
    }

    // Mongoose: the document failed the model's own rules.
    if (known.name === "ValidationError") {
      return { status: 400, message: known.message ?? "Invalid data" };
    }

    // Uploads: file too large, too many files and so on.
    if (known.name === "MulterError") {
      return { status: 400, message: known.message ?? "Upload failed" };
    }

    // Errors from Express middleware (for example invalid JSON in a request body) carry a status.
    const status = Number(known.status);
    if (Number.isInteger(status) && status >= 400 && status < 600) {
      return { status, message: known.message ?? "Request failed" };
    }
  }

  return { status: 500, message: error instanceof Error ? error.message : "Something went wrong" };
}
