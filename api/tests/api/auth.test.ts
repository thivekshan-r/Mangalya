import request from "supertest";
import { createApp } from "../../src/app";
import { SESSION_COOKIE } from "../../src/lib/auth";
import { TEST_PASSWORD, createUser, loginAs, useTestDatabase } from "../helpers/db";

describe("login", () => {
  useTestDatabase();

  it("logs in with the right email and password and sets an httpOnly cookie", async () => {
    const app = createApp();
    const user = await createUser("owner");

    const response = await request(app).post("/api/auth/login").send({ email: user.email, password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: user.id, name: "Test owner", email: user.email, role: "owner" });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");

    const cookie = String(response.headers["set-cookie"]);
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("accepts the email in any letter case", async () => {
    const app = createApp();
    await createUser("owner", { email: "owner@mangalya.test" });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "Owner@Mangalya.TEST", password: TEST_PASSWORD });

    expect(response.status).toBe(200);
  });

  it("refuses a wrong password, an unknown email and a switched-off account with the same message", async () => {
    const app = createApp();
    const user = await createUser("owner");
    await createUser("staff", { email: "off@mangalya.test", active: false });

    const wrongPassword = await request(app).post("/api/auth/login").send({ email: user.email, password: "nope" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@mangalya.test", password: TEST_PASSWORD });
    const switchedOff = await request(app)
      .post("/api/auth/login")
      .send({ email: "off@mangalya.test", password: TEST_PASSWORD });

    for (const response of [wrongPassword, unknownEmail, switchedOff]) {
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Wrong email or password");
      expect(response.headers["set-cookie"]).toBeUndefined();
    }
  });

  it("reports who is logged in, and nobody after logout", async () => {
    const app = createApp();
    const { agent, user } = await loginAs(app, "staff");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(user.email);
    expect(me.body.user.role).toBe("staff");

    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("locks out an account that is switched off after logging in", async () => {
    const app = createApp();
    const { agent, user } = await loginAs(app, "staff");

    user.active = false;
    await user.save();

    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("rejects a forged cookie", async () => {
    const app = createApp();
    await createUser("owner");

    const response = await request(app).get("/api/auth/me").set("Cookie", `${SESSION_COOKIE}=not-a-real-token`);

    expect(response.status).toBe(401);
  });
});
