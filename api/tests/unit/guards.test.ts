import request from "supertest";
import { createApp } from "../../src/app";

// These tests run with no database connected, to check what happens before
// any query is made: the "database is down" answer, the origin check and the
// login rate limit.

describe("without a database", () => {
  const app = createApp();

  it.each(["/api/products", "/api/products/teak-frame", "/api/categories", "/api/settings", "/api/admin/products"])(
    "GET %s answers 503 straight away",
    async (path) => {
      const response = await request(app).get(path);

      expect(response.status).toBe(503);
      expect(response.body.error).toMatch(/database/i);
    },
  );

  it("answers 503 to the enquiry form and the password change", async () => {
    const enquiry = await request(app).post("/api/enquiries").send({ name: "Asha", phone: "0771234567" });
    const password = await request(app).post("/api/auth/password").send({});

    expect(enquiry.status).toBe(503);
    expect(password.status).toBe(503);
  });

  it("still answers the health check and unknown routes", async () => {
    expect((await request(app).get("/api/health")).status).toBe(200);
    expect((await request(app).get("/api/nope")).status).toBe(404);
  });

  it("lets anyone log out", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(204);
    expect(String(response.headers["set-cookie"])).toContain("mangalya_session=;");
  });
});

describe("requests from other websites", () => {
  const app = createApp();

  it("blocks changes started by a site that is not ours", async () => {
    const login = await request(app).post("/api/auth/login").set("Origin", "https://evil.example").send({});
    const admin = await request(app).post("/api/admin/products").set("Origin", "https://evil.example").send({});
    const enquiry = await request(app).post("/api/enquiries").set("Origin", "https://evil.example").send({});

    expect(login.status).toBe(403);
    expect(admin.status).toBe(403);
    expect(enquiry.status).toBe(403);
  });

  it("allows our own site and tools that send no Origin", async () => {
    const ours = await request(app).post("/api/auth/logout").set("Origin", "http://localhost:3000");
    const tool = await request(app).post("/api/auth/logout");

    expect(ours.status).toBe(204);
    expect(tool.status).toBe(204);
  });
});

describe("login rate limit", () => {
  it("blocks the eleventh failed attempt", async () => {
    const app = createApp();
    const attempt = () => request(app).post("/api/auth/login").send({ email: "a@b.lk", password: "wrong" });

    for (let count = 0; count < 10; count += 1) {
      expect((await attempt()).status).toBe(503); // no database in this test, so each attempt fails
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/too many/i);
  });
});
