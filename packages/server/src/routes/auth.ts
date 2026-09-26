import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { login, signup } from "../auth-service";
import sessionRepo from "../db/session.repo";
import { extractToken, validateSession } from "../auth";
import { errorSchema, okSchema } from "./openapi-schemas";
import { jsonBody, jsonContent } from "./crud";

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

export const authRoutes = new OpenAPIHono()
  .openapi(
    createRoute({
      method: "post",
      path: "/login",
      request: jsonBody(loginSchema),
      responses: {
        200: jsonContent(authResponseSchema),
        401: jsonContent(errorSchema, "Login failed"),
      },
    }),
    async (c) => {
      const data = c.req.valid("json");
      console.log(`[login] attempt username=${data.username}`);
      try {
        const result = await login(data.username, data.password);
        console.log(`[login] success username=${data.username} userId=${result.userId}`);
        setAuthCookie(c, result.token);
        return c.json(result, 200);
      } catch (e) {
        console.log(
          `[login] failed username=${data.username} error=${e instanceof Error ? e.message : String(e)}`,
        );
        throw e;
      }
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/signup",
      request: jsonBody(signupSchema),
      responses: {
        200: jsonContent(authResponseSchema),
        409: jsonContent(errorSchema, "Conflict"),
      },
    }),
    async (c) => {
      const data = c.req.valid("json");
      const result = await signup(data.username, data.password, data.name);
      setAuthCookie(c, result.token);
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/logout",
      responses: {
        200: jsonContent(okSchema),
        401: jsonContent(errorSchema, "Unauthorized"),
      },
    }),
    async (c) => {
      const token = extractToken(c.req.raw);
      if (!token) throw new HTTPException(401, { message: "Unauthorized" });
      const userId = await validateSession(token);
      await sessionRepo.removeAllForUser(userId);
      return c.json({ ok: true as const }, 200);
    },
  );
