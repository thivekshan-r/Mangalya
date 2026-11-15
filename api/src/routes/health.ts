import { Router } from "express";
import { databaseStatus } from "../config/db";

export const healthRouter = Router();

/**
 * GET /api/health
 * A quick "is the API alive?" check, used by the home page in Step 1
 * and by the hosting provider's health checks later.
 */
healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Hello from the Mangalya API",
    database: databaseStatus(),
    time: new Date().toISOString(),
  });
});
