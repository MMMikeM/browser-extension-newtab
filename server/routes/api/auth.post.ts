import { defineHandler } from "h3";
import { validateToken } from "../../../src/server/auth";

export default defineHandler(async (event) => {
  const body = (await event.req.json()) as { token?: string };
  const token = body?.token;

  if (!token || typeof token !== "string") {
    return new Response("Missing token", { status: 400 });
  }

  try {
    validateToken(token);
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  event.res.headers.set(
    "Set-Cookie",
    `auth=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${60 * 60 * 24 * 365}`,
  );

  return { ok: true };
});
