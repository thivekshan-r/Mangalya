import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { parse } from "../lib/validate";
import { Enquiry } from "../models/enquiry";
import { enquiryCreateSchema } from "../schemas";

/**
 * The wholesale form on the website posts here. No login is needed, so it is
 * rate-limited to stop a script from flooding the shop with enquiries.
 * Built per app, so each app (and each test) gets its own counter.
 */
export function createEnquiryRouter() {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "You have sent several enquiries already. Please wait a few minutes, or message us on WhatsApp." },
  });

  /** POST /api/enquiries  { name, phone, businessName?, town?, items?, message? } */
  router.post("/", limiter, async (req, res) => {
    const input = parse(enquiryCreateSchema, req.body);

    const enquiry = await Enquiry.create(input);

    res.status(201).json({ enquiry: { id: enquiry.id as string } });
  });

  return router;
}
