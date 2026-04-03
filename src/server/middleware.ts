import { Hono } from "hono";
import { extractToken, validateSession } from "./auth";

export type AuthEnv = { Variables: { userId: string } };

/** Creates a new Hono app with auth middleware pre-applied. */
export const authed = () =>
  new Hono<AuthEnv>().use(async (c, next) => {
    const token = extractToken(c.req.raw, new URL(c.req.url));
    if (!token) return c.json({ error: "Unauthorized" }, 401);
    try {
      c.set("userId", await validateSession(token));
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  });
