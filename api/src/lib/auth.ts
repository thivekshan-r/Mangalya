import bcrypt from "bcryptjs";
import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ROLES, type Role } from "../models/user";

/** Name of the login cookie. */
export const SESSION_COOKIE = "mangalya_session";

const SESSION_SECONDS = env.sessionDays * 24 * 60 * 60;

// Higher is slower to crack and slower to log in. 12 is a sensible middle. Tests use 4 to stay fast.
const BCRYPT_ROUNDS = env.nodeEnv === "test" ? 4 : 12;

/** A well-formed hash that matches no password, used when the email is unknown (see routes/auth.ts). */
export const DUMMY_HASH = bcrypt.hashSync("no-such-user", BCRYPT_ROUNDS);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type Session = { userId: string; role: Role };

/** Creates the signed token stored in the login cookie. */
export function signSession(session: Session): string {
  return jwt.sign({ role: session.role }, env.jwtSecret, {
    subject: session.userId,
    expiresIn: SESSION_SECONDS,
    algorithm: "HS256",
  });
}

/** Returns the session inside a token, or null if the token is missing, forged or expired. */
export function readSession(token: unknown): Session | null {
  if (typeof token !== "string" || token.length === 0) return null;

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    if (typeof payload === "string") return null;

    const role = payload.role as Role;
    if (!payload.sub || !ROLES.includes(role)) return null;

    return { userId: payload.sub, role };
  } catch {
    return null;
  }
}

/**
 * How the login cookie is stored in the browser.
 * - httpOnly: JavaScript on the page cannot read it, which blunts XSS attacks.
 * - secure: sent over HTTPS only (on the live site).
 * - sameSite "lax": not sent on requests started by other websites, which blunts CSRF.
 *
 * The admin panel reaches the API through the website's own address (a Next.js
 * rewrite, added in Step 4), so the cookie is a normal first-party cookie and
 * works in Safari, which blocks cross-site cookies.
 */
export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS * 1000,
  };
}
