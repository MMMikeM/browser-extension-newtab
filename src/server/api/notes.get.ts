import { defineHandler } from "h3";
import { extractToken, validateToken } from "../auth";
import noteRepo from "../db/note.repo";

export default defineHandler(async (event) => {
  const token = extractToken(event.req);
  if (!token) return new Response("Unauthorized", { status: 401 });

  try {
    validateToken(token);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  return noteRepo.list();
});
