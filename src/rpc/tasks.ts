import { createServerFn } from "@tanstack/react-start";
import { taskSelectSchema, taskInsertSchema, taskUpdateSchema } from "../server/db/schema";
import { authMiddleware } from "../lib/middleware";
import { notifyOtherDevices } from "../server/push";
import { broadcastChange } from "../server/events";
import taskRepo from "../server/db/task.repo";
import type { TaskSelect } from "../server/db/task.repo";

export type Task = TaskSelect;

export const getTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => taskRepo.list());

export const createTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskInsertSchema)
  .handler(async ({ data }) => {
    const task = await taskRepo.insert(data);
    broadcastChange();
    notifyOtherDevices().catch(() => {});
    return task;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskUpdateSchema)
  .handler(async ({ data: { id, updatedAt, ...fields } }) => {
    const result = await taskRepo.update(id, updatedAt, fields);
    broadcastChange();
    notifyOtherDevices().catch(() => {});
    return result;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskSelectSchema)
  .handler(async ({ data }) => {
    const result = await taskRepo.remove(data.id);
    broadcastChange();
    notifyOtherDevices().catch(() => {});
    return result;
  });
