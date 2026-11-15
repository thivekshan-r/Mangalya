import request from "supertest";
import { createApp } from "../../src/app";

const app = createApp();

describe("GET /api/health", () => {
  it("responds with status ok and a message", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.message).toBe("Hello from the Mangalya API");
    expect(typeof response.body.database).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.time))).toBe(false);
  });

  it("allows the website's address to call the API", async () => {
    const response = await request(app).get("/api/health").set("Origin", "http://localhost:3000");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("does not allow other websites", async () => {
    const response = await request(app).get("/api/health").set("Origin", "https://example.com");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("unknown routes", () => {
  it("responds with 404 and a JSON error", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("/api/does-not-exist");
  });
});

describe("bad requests", () => {
  it("responds with 400 for invalid JSON instead of crashing", async () => {
    const response = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{ not json");

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe("string");
  });
});
