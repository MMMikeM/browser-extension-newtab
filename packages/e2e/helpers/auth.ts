import type { Page } from "@playwright/test";
import type { TestUser } from "./users";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

export type AuthResult = {
  userId: string;
  token: string;
  name: string;
  username: string;
};

/**
 * Signs up the test user on first run; falls back to login on subsequent runs
 * (409 = username already taken).
 */
export const getOrCreateUser = async (user: TestUser): Promise<AuthResult> => {
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.username, password: user.password, name: user.name }),
  });

  if (signupRes.ok) return signupRes.json() as Promise<AuthResult>;
  if (signupRes.status !== 409) {
    throw new Error(
      `Signup failed for ${user.username}: ${signupRes.status} ${await signupRes.text()}`,
    );
  }

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.username, password: user.password }),
  });

  if (!loginRes.ok) {
    throw new Error(
      `Login failed for ${user.username}: ${loginRes.status} ${await loginRes.text()}`,
    );
  }
  return loginRes.json() as Promise<AuthResult>;
};

/**
 * Seeds the page's localStorage with auth state so the app treats the session
 * as authenticated. Call this before reload/navigation.
 */
export const signIn = async (page: Page, auth: AuthResult): Promise<void> => {
  await page.evaluate(({ userId, token, name, username }) => {
    localStorage.setItem("newtab-todo-token", token);
    localStorage.setItem("newtab-todo-user-id", userId);
    localStorage.setItem("newtab-todo-user-info", JSON.stringify({ id: userId, name, username }));
  }, auth);
};
