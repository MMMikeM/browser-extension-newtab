import { createRoute, z } from "@hono/zod-openapi";
import { createId } from "@paralleldrive/cuid2";
import taskRepo, {
  taskInsertSchema,
  taskUpdateSchema,
  taskSelectSchema,
  taskShareSelectSchema,
  taskResponseSchema,
  taskShareResponseSchema,
} from "../db/task.repo";
import userRepo from "../db/user.repo";
import { authed } from "../middleware";
import { errorSchema } from "./openapi-schemas";

const listTasks = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      description: "List all tasks with relations",
      content: { "application/json": { schema: z.array(z.any()) } },
    },
  },
});

const createTask = createRoute({
  method: "post",
  path: "/",
  request: { body: { content: { "application/json": { schema: taskInsertSchema } } } },
  responses: {
    200: {
      description: "Created task",
      content: { "application/json": { schema: taskResponseSchema } },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const updateTask = createRoute({
  method: "put",
  path: "/",
  request: { body: { content: { "application/json": { schema: taskUpdateSchema } } } },
  responses: {
    200: {
      description: "Updated task",
      content: { "application/json": { schema: taskResponseSchema } },
    },
  },
});

const deleteTask = createRoute({
  method: "delete",
  path: "/",
  request: { body: { content: { "application/json": { schema: taskSelectSchema } } } },
  responses: {
    200: {
      description: "Deleted task",
      content: { "application/json": { schema: taskResponseSchema } },
    },
  },
});

const shareSchema = z.object({
  taskId: z.string(),
  username: z.string().min(1),
  permission: z.enum(["view", "edit"]).default("edit"),
});

const shareTask = createRoute({
  method: "post",
  path: "/share",
  request: { body: { content: { "application/json": { schema: shareSchema } } } },
  responses: {
    200: {
      description: "Shared task",
      content: { "application/json": { schema: taskShareResponseSchema } },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: errorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const unshareTask = createRoute({
  method: "delete",
  path: "/share",
  request: { body: { content: { "application/json": { schema: taskShareSelectSchema } } } },
  responses: {
    200: {
      description: "Unshared task",
      content: { "application/json": { schema: taskShareResponseSchema } },
    },
  },
});

export const taskRoutes = authed()
  .openapi(listTasks, async (c) => {
    const result = await taskRepo.list(c.get("userId"));
    return c.json(result, 200);
  })
  .openapi(createTask, async (c) => {
    const data = c.req.valid("json");
    if (data.parentId) {
      const parent = await taskRepo.findById(data.parentId);
      if (parent.parentId) return c.json({ error: "Cannot nest subtasks more than one level" }, 400);
    }
    const result = await taskRepo.insert(data);
    return c.json(result, 200);
  })
  .openapi(updateTask, async (c) => {
    const { id, updatedAt, ...fields } = c.req.valid("json");
    const result = await taskRepo.update(id, updatedAt, fields);
    return c.json(result, 200);
  })
  .openapi(deleteTask, async (c) => {
    const { id } = c.req.valid("json");
    const result = await taskRepo.remove(id);
    return c.json(result, 200);
  })
  .openapi(shareTask, async (c) => {
    const data = c.req.valid("json");
    const userId = c.get("userId");
    const [task, targetUser] = await Promise.all([
      taskRepo.findById(data.taskId),
      userRepo.findByUsername(data.username),
    ]);
    if (task.userId !== userId) return c.json({ error: "Not authorized" }, 403);
    if (targetUser.id === userId) return c.json({ error: "Cannot share with yourself" }, 400);

    const result = await taskRepo.insertShare({
      id: createId(),
      taskId: data.taskId,
      sharedWithUserId: targetUser.id,
      permission: data.permission,
    });

    return c.json(result, 200);
  })
  .openapi(unshareTask, async (c) => {
    const { id } = c.req.valid("json");
    const result = await taskRepo.removeShare(id);
    return c.json(result, 200);
  });
