import type { AppType } from "~/server/app";
import { hc } from "hono/client";
import { getAuthToken } from "~/lib/auth-token";

// In dev, API is on the same origin (Hono dev server plugin).
// In prod/extension, SERVER_URL points to the deployed server.
const serverUrl = import.meta.env.DEV ? "" : (import.meta.env.SERVER_URL ?? "");

// Wrap fetch to inject auth header on every request
export const client = hc<AppType>(serverUrl, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getAuthToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  },
});
