"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";

const API_URL = (process.env.API_URL ?? "").trim().replace(/\/+$/, "");
const SESSION_COOKIE = "mangalya_session";

/**
 * Makes the customer site show admin changes straight away, instead of
 * waiting for its few-minute cache to run out. Called after every save.
 *
 * Anyone can call a Server Action, so it first checks with the API that
 * the caller is logged in to the admin panel.
 */
export async function refreshSite(): Promise<void> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session || !API_URL) return;

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${session}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return;
  } catch {
    return;
  }

  updateTag("catalogue");
  updateTag("settings");
}
