import { OpenAPIHono } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import { extractToken, validateSession } from "./auth";

export type AuthEnv = { Variables: { userId: string } };

/** Auth middleware that validates session tokens. */
const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const token = extractToken(c.req.raw, new URL(c.req.url));
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  try {
    c.set("userId", await validateSession(token));
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};

/** Creates a new OpenAPIHono app with auth middleware pre-applied. */
export const authed = () => {
  const app = new OpenAPIHono<AuthEnv>();
  app.use(authMiddleware);
  return app;
};
