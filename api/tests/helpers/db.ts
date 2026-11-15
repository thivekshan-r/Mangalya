import { randomBytes } from "node:crypto";
import os from "node:os";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import type { Express } from "express";
import { hashPassword } from "../../src/lib/auth";
import { Category } from "../../src/models/category";
import { User, type Role } from "../../src/models/user";

/**
 * Database helpers for the API tests.
 *
 * The tests run against a real MongoDB that lives in memory and is thrown
 * away afterwards, so they never touch your Atlas database. The first run
 * downloads MongoDB (a few hundred MB) and can take a couple of minutes.
 */
let server: MongoMemoryServer | undefined;

/** Call inside a `describe` to give its tests a clean database. */
export function useTestDatabase() {
  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    await mongoose.connect(server.getUri(), {
      dbName: "mangalya-test",
      // The MongoDB driver loads Node's "os" module with a dynamic import(), which
      // Jest does not support by default. Without it the driver sends an empty
      // handshake and the server refuses the connection. Handing it over directly fixes that.
      runtimeAdapters: { os },
    });
    // Make sure unique indexes exist before any test relies on them.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  }, 300_000);

  afterEach(async () => {
    if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) return;
    await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
  }, 30_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await server?.stop();
  });
}

/** A fresh random password for each test run. */
export const TEST_PASSWORD = randomBytes(12).toString("hex");

export async function createUser(role: Role = "owner", overrides: { email?: string; active?: boolean } = {}) {
  return User.create({
    name: `Test ${role}`,
    email: overrides.email ?? `${role}@mangalya.test`,
    passwordHash: await hashPassword(TEST_PASSWORD),
    role,
    active: overrides.active ?? true,
  });
}

/** Creates a user and returns a client that is logged in as them (it keeps the cookie). */
export async function loginAs(app: Express, role: Role = "owner") {
  const user = await createUser(role);
  const agent = request.agent(app);

  const response = await agent.post("/api/auth/login").send({ email: user.email, password: TEST_PASSWORD });
  if (response.status !== 200) {
    throw new Error(`Test login failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return { agent, user };
}

export async function createCategory(name = "Photo frames", slug = "photo-frames") {
  return Category.create({ slug, name: { en: name, ta: "" } });
}
