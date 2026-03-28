import { createServerFn } from "@tanstack/react-start";
import { taskSelectSchema, taskInsertSchema, taskUpdateSchema } from "../server/db/schema";
import { authMiddleware } from "../lib/middleware";
import { notifyOtherDevices } from "../server/push";
import { TaskSelect, listTasks, updateTask } from "../server/db/tasks";

export type Task = TaskSelect;

export const getTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => listTasks());

export const createTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskInsertSchema)
  .handler(async ({ data }) => {
    const task = await insertTask(data);
    notifyOtherDevices().catch(() => { });
    return task;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskUpdateSchema)
  .handler(async ({ data: { id, updatedAt, ...fields } }) => {
    const result = await updateTask(id, updatedAt, fields);
    notifyOtherDevices().catch(() => { });
    return result;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskSelectSchema)
  .handler(async ({ data }) => {
    const result = await deleteTask(data.id);
    notifyOtherDevices().catch(() => { });
    return result;
  });
