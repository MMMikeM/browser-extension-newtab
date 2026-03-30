import { defineHandler } from "h3";
import { extractToken, validateToken } from "../auth";
import userRepo from "../db/user.repo";

export default defineHandler(async (event) => {
  const token = extractToken(event.req);
  if (!token) return new Response("Unauthorized", { status: 401 });

  try {
    validateToken(token);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  return userRepo.list();
});
