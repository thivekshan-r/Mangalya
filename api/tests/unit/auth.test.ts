import jwt from "jsonwebtoken";
import {
  DUMMY_HASH,
  hashPassword,
  readSession,
  sessionCookieOptions,
  signSession,
  verifyPassword,
} from "../../src/lib/auth";

describe("passwords", () => {
  it("stores a hash, never the password, and verifies it", async () => {
    const hash = await hashPassword("correct horse battery");

    expect(hash).not.toContain("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("gives the same password a different hash each time", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("has a dummy hash that matches nothing a visitor could type", async () => {
    expect(await verifyPassword("", DUMMY_HASH)).toBe(false);
    expect(await verifyPassword("password", DUMMY_HASH)).toBe(false);
  });
});

describe("sessions", () => {
  const session = { userId: "0123456789abcdef01234567", role: "staff" as const };

  it("round-trips a session through a token", () => {
    expect(readSession(signSession(session))).toEqual(session);
  });

  it("rejects missing, malformed and tampered tokens", () => {
    const token = signSession(session);
    const [header, payload, signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: session.userId, role: "owner" })).toString("base64url");

    expect(readSession(undefined)).toBeNull();
    expect(readSession("")).toBeNull();
    expect(readSession("not-a-token")).toBeNull();
    expect(readSession(`${header}.${forgedPayload}.${signature}`)).toBeNull();
    expect(readSession(`${header}.${payload}.AAAA`)).toBeNull();
  });

  it("rejects tokens signed with another secret, unsigned tokens and expired tokens", () => {
    const otherSecret = jwt.sign({ role: "owner" }, "some-other-secret", { subject: session.userId });
    const unsigned = jwt.sign({ role: "owner" }, "", { subject: session.userId, algorithm: "none" });

    expect(readSession(otherSecret)).toBeNull();
    expect(readSession(unsigned)).toBeNull();

    jest.useFakeTimers();
    try {
      const token = signSession(session);
      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // sessions last 7 days by default
      expect(readSession(token)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("rejects a token with an unknown role", () => {
    const { env } = jest.requireActual("../../src/config/env") as typeof import("../../src/config/env");
    const token = jwt.sign({ role: "superadmin" }, env.jwtSecret, { subject: session.userId });

    expect(readSession(token)).toBeNull();
  });

  it("uses a cookie that scripts cannot read and other sites cannot send", () => {
    expect(sessionCookieOptions()).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });
});
