import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { requireAuth, requireDatabase, requireTrustedOrigin } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/errors";
import { adminRouter } from "./routes/admin";
import { createAuthRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { publicRouter } from "./routes/public";

/**
 * Builds the Express app without starting it.
 * Keeping this separate from server.ts lets the tests call the app directly,
 * with no port.
 */
export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  // On the live site the API sits behind the host's proxy. Trusting one hop
  // lets Express (and the login rate limit) see the visitor's real address.
  if (env.isProduction) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.webOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  // Is the API alive? Works even without a database.
  app.use("/api/health", healthRouter);

  // Login, logout, "who am I".
  app.use("/api/auth", requireTrustedOrigin, createAuthRouter());

  // Admin panel: every route needs a login.
  app.use("/api/admin", requireTrustedOrigin, requireDatabase, requireAuth, adminRouter);

  // Customer site: read-only, no login.
  app.use(["/api/products", "/api/categories", "/api/settings"], requireDatabase);
  app.use("/api", publicRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
