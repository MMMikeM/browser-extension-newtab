import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { login, signup } from "../auth-service";
import sessionRepo from "../db/session.repo";
import { extractToken, validateSession } from "../auth";
import { errorSchema, okSchema } from "./openapi-schemas";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const authResponseSchema = z.object({
  userId: z.string(),
  token: z.string(),
  name: z.string(),
  username: z.string(),
});

const setAuthCookie = (c: { header: (name: string, value: string) => void }, token: string) => {
  c.header(
    "Set-Cookie",
    `auth=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${60 * 60 * 24 * 365}`,
  );
};

const loginRoute = createRoute({
  method: "post",
  path: "/login",
  request: { body: { content: { "application/json": { schema: loginSchema } } } },
  responses: {
    200: {
      description: "Login successful",
      content: { "application/json": { schema: authResponseSchema } },
    },
    401: {
      description: "Login failed",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const signupRoute = createRoute({
  method: "post",
  path: "/signup",
  request: { body: { content: { "application/json": { schema: signupSchema } } } },
  responses: {
    200: {
      description: "Signup successful",
      content: { "application/json": { schema: authResponseSchema } },
    },
    409: {
      description: "Signup failed",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  responses: {
    200: {
      description: "Logout successful",
      content: { "application/json": { schema: okSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

export const authRoutes = new OpenAPIHono()
  .openapi(loginRoute, async (c) => {
    const data = c.req.valid("json");
    try {
      const result = await login(data.username, data.password);
      setAuthCookie(c, result.token);
      return c.json(result, 200);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Login failed" }, 401);
    }
  })
  .openapi(signupRoute, async (c) => {
    const data = c.req.valid("json");
    try {
      const result = await signup(data.username, data.password, data.name);
      setAuthCookie(c, result.token);
      return c.json(result, 200);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Signup failed" }, 409);
    }
  })
  .openapi(logoutRoute, async (c) => {
    const token = extractToken(c.req.raw);
    if (!token) return c.json({ error: "Unauthorized" }, 401);
    try {
      const userId = await validateSession(token);
      await sessionRepo.removeAllForUser(userId);
      return c.json({ ok: true as const }, 200);
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
  });
