import type { RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { env } from "../config/env";
import { SESSION_COOKIE, readSession } from "../lib/auth";
import { User, type Role, type UserDoc } from "../models/user";
import { HttpError } from "./errors";

/**
 * Answers 503 straight away when MongoDB is not connected,
 * instead of leaving the visitor waiting for a query that cannot run.
 */
export const requireDatabase: RequestHandler = (_req, _res, next) => {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
    throw new HttpError(503, "The database is not available right now");
  }
  next();
};

/**
 * Blocks requests that change data when they were started by another website.
 * Browsers send an Origin header on such requests; it must be one of ours.
 * Requests with no Origin (server-to-server, tests, API tools) are allowed.
 */
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const readOnly = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  const origin = req.get("origin");

  if (!readOnly && origin && !env.webOrigins.includes(origin.replace(/\/+$/, ""))) {
    throw new HttpError(403, "This request came from a website that is not allowed");
  }
  next();
};

/**
 * Requires a valid login cookie. Loads the user on every request, so an
 * account that was switched off or deleted loses access immediately.
 * Handlers read the user with `currentUser(res)`.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = readSession(req.cookies?.[SESSION_COOKIE]);
  if (!session) throw new HttpError(401, "Please log in");

  const user = await User.findById(session.userId);
  if (!user || !user.active) throw new HttpError(401, "Please log in");

  res.locals.user = user;
  next();
};

/** Requires one of the given roles: `requireRole("owner")`. Use after requireAuth. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (_req, res, next) => {
    if (!roles.includes(currentUser(res).role as Role)) {
      throw new HttpError(403, "Your account is not allowed to do this");
    }
    next();
  };
}

/** The logged-in user, set by requireAuth. */
export function currentUser(res: Response): UserDoc {
  const user = res.locals.user as UserDoc | undefined;
  if (!user) throw new HttpError(401, "Please log in");
  return user;
}
