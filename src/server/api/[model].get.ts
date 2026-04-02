import { defineHandler, getRouterParam } from "h3";
import { extractToken, validateToken } from "../auth";
import categoryRepo from "../db/category.repo";
import taskRepo from "../db/task.repo";
import userRepo from "../db/user.repo";
import noteRepo from "../db/note.repo";

const repos: Record<string, { list: () => Promise<unknown[]> }> = {
  categories: categoryRepo,
  tasks: taskRepo,
  users: userRepo,
  notes: noteRepo,
};

export default defineHandler(async (event) => {
  const model = getRouterParam(event, "model");
  const repo = model ? repos[model] : undefined;
  if (!repo) return new Response("Not Found", { status: 404 });

  const token = extractToken(event.req);
  if (!token) return new Response("Unauthorized", { status: 401 });

  try {
    validateToken(token);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  return repo.list();
});
