import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { login, signup } from "../auth-service";
import sessionRepo from "../db/session.repo";
import { extractToken, validateSession } from "../auth";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const setAuthCookie = (c: { header: (name: string, value: string) => void }, token: string) => {
  c.header(
    "Set-Cookie",
    `auth=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${60 * 60 * 24 * 365}`,
  );
};

export const authRoutes = new Hono()
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const data = c.req.valid("json");
    try {
      const result = await login(data.username, data.password);
      setAuthCookie(c, result.token);
      return c.json(result);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Login failed" }, 401);
    }
  })
  .post("/signup", zValidator("json", signupSchema), async (c) => {
    const data = c.req.valid("json");
    try {
      const result = await signup(data.username, data.password, data.name);
      setAuthCookie(c, result.token);
      return c.json(result);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Signup failed" }, 409);
    }
  })
  .post("/logout", async (c) => {
    const token = extractToken(c.req.raw);
    if (!token) return c.json({ error: "Unauthorized" }, 401);
    try {
      const userId = await validateSession(token);
      await sessionRepo.removeAllForUser(userId);
      return c.json({ ok: true });
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
  });
