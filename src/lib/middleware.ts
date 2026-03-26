import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { validateToken } from "./auth.server";

export const authMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const token = localStorage.getItem("newtab-todo-token") || "";
    return next({
      headers: { Authorization: `Bearer ${token}` },
    });
  })
  .server(async ({ next }) => {
    const header = getRequestHeader("Authorization");
    const token = header?.replace(/^Bearer\s+/i, "") ?? "";
    validateToken(token);
    return next();
  });
