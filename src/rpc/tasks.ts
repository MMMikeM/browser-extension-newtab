import { createServerFn } from "@tanstack/react-start";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { taskSelectSchema, taskInsertSchema, taskUpdateSchema, taskShareSelectSchema } from "~/server/db/task.repo";
import { authMiddleware } from "~/lib/middleware";
import { notifyAll } from "./notify";
import taskRepo from "~/server/db/task.repo";
import userRepo from "~/server/db/user.repo";
import type { TaskWithRelations } from "~/server/db/task.repo";

export type Task = TaskWithRelations;

export const getTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => taskRepo.list(context.userId));

export const createTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskInsertSchema)
  .handler(async ({ data }) => {
    if (data.parentId) {
      const parent = await taskRepo.findById(data.parentId);
      if (!parent) throw new Error("Parent task not found");
      if (parent.parentId) throw new Error("Cannot nest subtasks more than one level");
    }
    const result = await taskRepo.insert(data);
    notifyAll();
    return result;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskUpdateSchema)
  .handler(async ({ data: { id, updatedAt, ...fields } }) => {
    const result = await taskRepo.update(id, updatedAt, fields);
    notifyAll();
    return result;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskSelectSchema)
  .handler(async ({ data }) => {
    const result = await taskRepo.remove(data.id);
    notifyAll();
    return result;
  });

// --- Shares ---

export const shareTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ taskId: z.string(), username: z.string().min(1), permission: z.enum(["view", "edit"]).default("edit") }))
  .handler(async ({ data, context }) => {
    const [task, targetUser] = await Promise.all([
      taskRepo.findById(data.taskId),
      userRepo.findByUsername(data.username),
    ]);
    if (task.userId !== context.userId) throw new Error("Not authorized");
    if (targetUser.id === context.userId) throw new Error("Cannot share with yourself");

    const result = await taskRepo.insertShare({
      id: createId(),
      taskId: data.taskId,
      sharedWithUserId: targetUser.id,
      permission: data.permission,
    });
    notifyAll();
    return result;
  });

export const deleteTaskShare = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskShareSelectSchema)
  .handler(async ({ data }) => {
    const result = await taskRepo.removeShare(data.id);
    notifyAll();
    return result;
  });
