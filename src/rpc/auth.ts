import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { login, signup } from "~/server/auth-service";
import sessionRepo from "~/server/db/session.repo";
import { authMiddleware } from "~/lib/middleware";

const setAuthCookie = (token: string) => {
  setResponseHeaders(
    new Headers({
      "Set-Cookie": `auth=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${60 * 60 * 24 * 365}`,
    }),
  );
};

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  name: z.string(),
});

export const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    const result = await login(data.username, data.password);
    setAuthCookie(result.token);
    return result;
  });

export const signupFn = createServerFn({ method: "POST" })
  .inputValidator(signupSchema)
  .handler(async ({ data }) => {
    const result = await signup(data.username, data.password, data.name);
    setAuthCookie(result.token);
    return result;
  });

export const logoutFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await sessionRepo.removeAllForUser(context.userId);
    return { ok: true };
  });
