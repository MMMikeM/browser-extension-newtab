import { defineHandler, getRouterParam } from "h3";
import { extractToken, validateSession } from "../auth";
import categoryRepo from "../db/category.repo";
import taskRepo from "../db/task.repo";
import noteRepo from "../db/note.repo";

const repos: Record<string, { list: (userId: string) => Promise<unknown[]> }> = {
  categories: categoryRepo,
  tasks: taskRepo,
  notes: noteRepo,
};

export default defineHandler(async (event) => {
  const model = getRouterParam(event, "model");
  const repo = model ? repos[model] : undefined;
  if (!repo) return new Response("Not Found", { status: 404 });

  const token = extractToken(event.req);
  if (!token) return new Response("Unauthorized", { status: 401 });

  let userId: string;
  try {
    userId = await validateSession(token);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  return repo.list(userId);
});
