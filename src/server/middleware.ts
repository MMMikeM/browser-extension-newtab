import { OpenAPIHono } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { extractToken, validateSession } from "./auth";

export type AuthEnv = { Variables: { userId: string } };

const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const token = extractToken(c.req.raw, new URL(c.req.url));
  if (!token) throw new HTTPException(401, { message: "Unauthorized" });
  c.set("userId", await validateSession(token));
  await next();
};

export const authed = () => {
  const app = new OpenAPIHono<AuthEnv>();
  app.use(authMiddleware);
  return app;
};
