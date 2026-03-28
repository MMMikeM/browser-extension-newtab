import { defineHandler } from "h3";
import { extractToken, validateToken } from "../../../src/server/auth";
import { db } from "../../../src/server/db";

export default defineHandler(async (event) => {
  const token = extractToken(event.req);
  if (!token) return new Response("Unauthorized", { status: 401 });

  try {
    validateToken(token);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const tasks = await db.query.tasks.findMany({
    orderBy: { sortOrder: "asc", createdAt: "asc" },
  });

  return tasks;
});
