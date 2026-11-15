import request from "supertest";
import { createApp } from "../../src/app";
import { Enquiry } from "../../src/models/enquiry";
import { User } from "../../src/models/user";
import { TEST_PASSWORD, loginAs, useTestDatabase } from "../helpers/db";

const ENQUIRY = {
  name: "Asha",
  businessName: "Asha Gifts",
  town: "Kandy",
  phone: "077 123 4567",
  items: [{ description: "Wooden wedding frame (FR-1)", quantity: "24" }],
  message: "Needed before December.",
};

describe("wholesale enquiries", () => {
  useTestDatabase();

  it("saves an enquiry from the website form", async () => {
    const app = createApp();

    const response = await request(app).post("/api/enquiries").send(ENQUIRY);

    expect(response.status).toBe(201);
    const saved = await Enquiry.findById(response.body.enquiry.id).orFail();
    expect(saved.type).toBe("wholesale");
    expect(saved.status).toBe("new");
    expect(saved.items[0]?.quantity).toBe(24);
  });

  it("refuses an enquiry without a name or phone number", async () => {
    const app = createApp();

    const response = await request(app).post("/api/enquiries").send({ name: " ", phone: "abc" });

    expect(response.status).toBe(400);
    const fields = response.body.details.fields.map((entry: { field: string }) => entry.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "phone"]));
    expect(await Enquiry.countDocuments()).toBe(0);
  });

  it("stops a flood of enquiries from one address", async () => {
    const app = createApp();

    for (let count = 0; count < 5; count += 1) {
      expect((await request(app).post("/api/enquiries").send(ENQUIRY)).status).toBe(201);
    }
    expect((await request(app).post("/api/enquiries").send(ENQUIRY)).status).toBe(429);
  });

  it("lists enquiries for staff, newest first, and counts the ones waiting", async () => {
    const app = createApp();
    const { agent } = await loginAs(app, "staff");
    await request(app).post("/api/enquiries").send({ ...ENQUIRY, name: "First" });
    await request(app).post("/api/enquiries").send({ ...ENQUIRY, name: "Second" });

    expect((await request(app).get("/api/admin/enquiries")).status).toBe(401);

    const response = await agent.get("/api/admin/enquiries");
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { name: string }) => item.name)).toEqual(["Second", "First"]);
    expect(response.body.waiting).toBe(2);
    expect(response.body.items[0]).toMatchObject({ phone: "077 123 4567", town: "Kandy", status: "new" });
  });

  it("marks an enquiry as replied, and lets only the owner delete it", async () => {
    const app = createApp();
    const staff = await loginAs(app, "staff");
    const owner = await loginAs(app, "owner");
    const created = await request(app).post("/api/enquiries").send(ENQUIRY);
    const id = created.body.enquiry.id;

    const replied = await staff.agent.patch(`/api/admin/enquiries/${id}`).send({ status: "replied" });
    expect(replied.body.enquiry.status).toBe("replied");
    expect((await staff.agent.get("/api/admin/enquiries?status=new")).body.total).toBe(0);
    expect((await staff.agent.patch(`/api/admin/enquiries/${id}`).send({ status: "lost" })).status).toBe(400);

    expect((await staff.agent.delete(`/api/admin/enquiries/${id}`)).status).toBe(403);
    expect((await owner.agent.delete(`/api/admin/enquiries/${id}`)).status).toBe(204);
    expect(await Enquiry.countDocuments()).toBe(0);
  });
});

describe("staff accounts", () => {
  useTestDatabase();

  const STAFF = { name: "Kumar", email: "Kumar@Shop.LK", password: "a-long-staff-password" };

  it("lets the owner add a staff account that can then log in", async () => {
    const app = createApp();
    const { agent } = await loginAs(app, "owner");

    const created = await agent.post("/api/admin/users").send(STAFF);
    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ name: "Kumar", email: "kumar@shop.lk", role: "staff", active: true });
    expect(JSON.stringify(created.body)).not.toContain("passwordHash");

    const login = await request(app).post("/api/auth/login").send({ email: "kumar@shop.lk", password: STAFF.password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("staff");
  });

  it("refuses a short password and an email that is already used", async () => {
    const app = createApp();
    const { agent } = await loginAs(app, "owner");

    expect((await agent.post("/api/admin/users").send({ ...STAFF, password: "short" })).status).toBe(400);
    expect((await agent.post("/api/admin/users").send(STAFF)).status).toBe(201);
    expect((await agent.post("/api/admin/users").send(STAFF)).status).toBe(409);
  });

  it("keeps staff out of account management", async () => {
    const app = createApp();
    const { agent } = await loginAs(app, "staff");

    expect((await agent.get("/api/admin/users")).status).toBe(403);
    expect((await agent.post("/api/admin/users").send(STAFF)).status).toBe(403);
  });

  it("switches a staff account off, sets a new password, and removes it", async () => {
    const app = createApp();
    const { agent } = await loginAs(app, "owner");
    const id = (await agent.post("/api/admin/users").send(STAFF)).body.user.id;
    const logIn = (password: string) => request(app).post("/api/auth/login").send({ email: "kumar@shop.lk", password });

    expect((await agent.patch(`/api/admin/users/${id}`).send({ active: false })).body.user.active).toBe(false);
    expect((await logIn(STAFF.password)).status).toBe(401);

    await agent.patch(`/api/admin/users/${id}`).send({ active: true, password: "another-long-password" });
    expect((await logIn(STAFF.password)).status).toBe(401);
    expect((await logIn("another-long-password")).status).toBe(200);

    const list = await agent.get("/api/admin/users");
    expect(list.body.items.map((user: { role: string }) => user.role)).toEqual(["owner", "staff"]);

    expect((await agent.delete(`/api/admin/users/${id}`)).status).toBe(204);
    expect(await User.countDocuments()).toBe(1);
  });

  it("does not let the owner switch off or delete their own or another owner account", async () => {
    const app = createApp();
    const { agent, user } = await loginAs(app, "owner");
    const other = await User.create({ name: "Other owner", email: "other@mangalya.test", passwordHash: "x", role: "owner" });

    expect((await agent.patch(`/api/admin/users/${user.id}`).send({ active: false })).status).toBe(400);
    expect((await agent.delete(`/api/admin/users/${user.id}`)).status).toBe(400);
    expect((await agent.patch(`/api/admin/users/${other.id}`).send({ active: false })).status).toBe(403);
    expect((await agent.delete(`/api/admin/users/${other.id}`)).status).toBe(403);
    expect(await User.countDocuments({ active: true })).toBe(2);
  });
});

describe("changing your own password", () => {
  useTestDatabase();

  it("needs the current password, then only the new one works", async () => {
    const app = createApp();
    const { agent, user } = await loginAs(app, "staff");
    const logIn = (password: string) => request(app).post("/api/auth/login").send({ email: user.email, password });

    const wrong = await agent.post("/api/auth/password").send({ currentPassword: "not-it", newPassword: "a-brand-new-password" });
    expect(wrong.status).toBe(400);

    const short = await agent.post("/api/auth/password").send({ currentPassword: TEST_PASSWORD, newPassword: "short" });
    expect(short.status).toBe(400);

    const changed = await agent.post("/api/auth/password").send({ currentPassword: TEST_PASSWORD, newPassword: "a-brand-new-password" });
    expect(changed.status).toBe(204);

    expect((await logIn(TEST_PASSWORD)).status).toBe(401);
    expect((await logIn("a-brand-new-password")).status).toBe(200);
  });

  it("needs a login", async () => {
    const app = createApp();

    const response = await request(app).post("/api/auth/password").send({ currentPassword: "a", newPassword: "a-brand-new-password" });

    expect(response.status).toBe(401);
  });
});
