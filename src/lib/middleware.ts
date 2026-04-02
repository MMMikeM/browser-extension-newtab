import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { validateSession } from "../server/auth";
import { TOKEN_KEY } from "./constants";

export const authMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    return next({
      headers: { Authorization: `Bearer ${token}` },
    });
  })
  .server(async ({ next }) => {
    const header = getRequestHeader("Authorization");
    const token = header?.replace(/^Bearer\s+/i, "") ?? "";
    const userId = await validateSession(token);
    return next({ context: { userId } });
  });
