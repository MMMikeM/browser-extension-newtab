import { defineHandler } from "h3";
import { extractToken, validateToken } from "../auth";
import taskRepo from "../db/task.repo";

export default defineHandler(async (event) => {
  const token = extractToken(event.req);
  if (!token) return new Response("Unauthorized", { status: 401 });

  try {
    validateToken(token);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  return taskRepo.list();
});
