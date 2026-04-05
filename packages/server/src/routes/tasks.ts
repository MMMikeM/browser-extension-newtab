import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { createId } from "@paralleldrive/cuid2";
import taskRepo, {
  taskInsertSchema,
  taskUpdateSchema,
  taskSelectSchema,
  taskShareSelectSchema,
  taskResponseSchema,
  taskShareResponseSchema,
  taskListItemSchema,
} from "../db/task.repo";
import userRepo from "../db/user.repo";
import contactRepo from "../db/contact.repo";
import { authed } from "../middleware";
import { broadcast } from "../broadcast";
import { errorSchema } from "./openapi-schemas";
import { jsonBody, jsonContent, withAuth } from "./crud";

const shareSchema = z.object({
  taskId: z.string(),
  username: z.string().min(1),
  permission: z.enum(["view", "edit"]).default("edit"),
});

export const taskRoutes = authed()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      responses: withAuth({ 200: jsonContent(z.array(taskListItemSchema)) }),
    }),
    async (c) => c.json(await taskRepo.list(c.get("userId")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      request: jsonBody(taskInsertSchema),
      responses: withAuth({
        200: jsonContent(taskResponseSchema),
        400: jsonContent(errorSchema, "Bad request"),
      }),
    }),
    async (c) => {
      const data = c.req.valid("json");
      if (data.parentId) {
        const parent = await taskRepo.findById(data.parentId);
        if (parent.parentId)
          throw new HTTPException(400, { message: "Cannot nest subtasks more than one level" });
      }
      const result = await taskRepo.insert({ ...data, userId: c.get("userId") });
      const taskWithRelations = { ...result, subtasks: [], shares: [] };
      broadcast(c, "tasks", "insert", taskWithRelations);
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/",
      request: jsonBody(taskUpdateSchema),
      responses: withAuth({ 200: jsonContent(taskResponseSchema) }),
    }),
    async (c) => {
      const { id, updatedAt, ...fields } = c.req.valid("json");
      const userId = c.get("userId");

      // Parallel: fetch task with its category's collab list + contact check (if assigneeId set).
      // The category.collaborators with-filter returns only the current user's row — empty = not a collab.
      const [task, isContact] = await Promise.all([
        taskRepo.findByIdWithAccess(id, userId),
        fields.assigneeId ? contactRepo.exists(userId, fields.assigneeId) : Promise.resolve(true),
      ]);

      const isOwner = task.userId === userId;
      const isCollab = (task.category?.collaborators.length ?? 0) > 0;
      if (!isOwner && !isCollab) throw new HTTPException(403, { message: "Not authorized" });
      if (!isContact) throw new HTTPException(400, { message: "Can only assign to a contact" });

      const result = await taskRepo.update(id, updatedAt, fields);
      broadcast(c, "tasks", "update", result);
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/",
      request: jsonBody(taskSelectSchema),
      responses: withAuth({ 200: jsonContent(taskResponseSchema) }),
    }),
    async (c) => {
      const { id } = c.req.valid("json");
      const userId = c.get("userId");

      const task = await taskRepo.findById(id);
      if (task.userId !== userId) throw new HTTPException(403, { message: "Not authorized" });

      const result = await taskRepo.remove(id);
      broadcast(c, "tasks", "delete", { id: result.id });
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/share",
      request: jsonBody(shareSchema),
      responses: withAuth({
        200: jsonContent(taskShareResponseSchema),
        400: jsonContent(errorSchema, "Bad request"),
        403: jsonContent(errorSchema, "Forbidden"),
      }),
    }),
    async (c) => {
      const data = c.req.valid("json");
      const userId = c.get("userId");
      const [task, targetUser] = await Promise.all([
        taskRepo.findById(data.taskId),
        userRepo.findByUsername(data.username.toLowerCase()),
      ]);
      if (task.userId !== userId) throw new HTTPException(403, { message: "Not authorized" });
      if (targetUser.id === userId)
        throw new HTTPException(400, { message: "Cannot share with yourself" });

      const result = await taskRepo.insertShare({
        id: createId(),
        taskId: data.taskId,
        sharedWithUserId: targetUser.id,
        permission: data.permission,
      });
      broadcast(c, "tasks", "update", { id: data.taskId });
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/share",
      request: jsonBody(taskShareSelectSchema),
      responses: withAuth({ 200: jsonContent(taskShareResponseSchema) }),
    }),
    async (c) => {
      const result = await taskRepo.removeShare(c.req.valid("json").id);
      broadcast(c, "tasks", "update", { id: result.taskId });
      return c.json(result, 200);
    },
  );
