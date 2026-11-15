import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { DUMMY_HASH, SESSION_COOKIE, sessionCookieOptions, signSession, verifyPassword } from "../lib/auth";
import { parse } from "../lib/validate";
import { currentUser, requireAuth, requireDatabase } from "../middleware/auth";
import { HttpError } from "../middleware/errors";
import { User, serializeUser, type Role } from "../models/user";
import { loginSchema } from "../schemas";

/** Built per app, so each app (and each test) gets its own attempt counter. */
export function createAuthRouter() {
  const router = Router();

  // Slows down password guessing: 10 failed attempts per address every 15 minutes.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please wait 15 minutes and try again." },
  });

  /** POST /api/auth/login  { email, password } */
  router.post("/login", loginLimiter, requireDatabase, async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);

    const user = await User.findOne({ email }).select("+passwordHash");

    // Compare against a dummy hash when the email is unknown, so the response
    // takes the same time either way and does not reveal which emails exist.
    const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordOk || !user.active) {
      throw new HttpError(401, "Wrong email or password");
    }

    user.lastLogin = new Date();
    await user.save();

    res.cookie(SESSION_COOKIE, signSession({ userId: user.id, role: user.role as Role }), sessionCookieOptions());
    res.json({ user: serializeUser(user) });
  });

  /** POST /api/auth/logout */
  router.post("/logout", (_req, res) => {
    // Clearing needs the same options the cookie was set with, minus its lifetime.
    const { maxAge: _maxAge, ...options } = sessionCookieOptions();
    void _maxAge;
    res.clearCookie(SESSION_COOKIE, options);
    res.status(204).end();
  });

  /** GET /api/auth/me  Who is logged in? Used by the admin panel on every page load. */
  router.get("/me", requireDatabase, requireAuth, (_req, res) => {
    res.json({ user: serializeUser(currentUser(res)) });
  });

  return router;
}
