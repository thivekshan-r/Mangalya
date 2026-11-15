import type { z } from "zod";
import { HttpError } from "../middleware/errors";

/**
 * Checks request data against a Zod schema and returns it fully typed.
 * Throws a 400 with a per-field list of problems when the data is wrong:
 *
 *   const input = parse(productCreateSchema, req.body);
 */
export function parse<Schema extends z.ZodType>(schema: Schema, data: unknown): z.infer<Schema> {
  const result = schema.safeParse(data ?? {});

  if (!result.success) {
    const fields = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "(body)",
      message: issue.message,
    }));
    throw new HttpError(400, "Please check the highlighted fields", { fields });
  }

  return result.data;
}
