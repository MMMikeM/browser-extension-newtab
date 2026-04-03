import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";
import taskRepo, {
  taskInsertSchema,
  taskUpdateSchema,
  taskSelectSchema,
  taskShareSelectSchema,
} from "../db/task.repo";
import userRepo from "../db/user.repo";
import { authed } from "../middleware";

export const taskRoutes = authed()
  .get("/", async (c) => c.json(await taskRepo.list(c.get("userId"))))
  .post("/", zValidator("json", taskInsertSchema), async (c) => {
    const data = c.req.valid("json");
    if (data.parentId) {
      const parent = await taskRepo.findById(data.parentId);
      if (parent.parentId) return c.json({ error: "Cannot nest subtasks more than one level" }, 400);
    }
    const result = await taskRepo.insert(data);

    return c.json(result);
  })
  .put("/", zValidator("json", taskUpdateSchema), async (c) => {
    const { id, updatedAt, ...fields } = c.req.valid("json");
    const result = await taskRepo.update(id, updatedAt, fields);

    return c.json(result);
  })
  .delete("/", zValidator("json", taskSelectSchema), async (c) => {
    const { id } = c.req.valid("json");
    const result = await taskRepo.remove(id);

    return c.json(result);
  })
  .post(
    "/share",
    zValidator(
      "json",
      z.object({
        taskId: z.string(),
        username: z.string().min(1),
        permission: z.enum(["view", "edit"]).default("edit"),
      }),
    ),
    async (c) => {
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
  
      return c.json(result);
    },
  )
  .delete("/share", zValidator("json", taskShareSelectSchema), async (c) => {
    const { id } = c.req.valid("json");
    const result = await taskRepo.removeShare(id);

    return c.json(result);
  });
