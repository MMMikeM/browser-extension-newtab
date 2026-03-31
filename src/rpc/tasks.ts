import { createServerFn } from "@tanstack/react-start";
import { taskSelectSchema, taskInsertSchema, taskUpdateSchema } from "~/server/db/schema";
import { authMiddleware } from "~/lib/middleware";
import { notifyAll } from "./notify";
import taskRepo from "~/server/db/task.repo";
import type { TaskSelect } from "~/server/db/task.repo";

export type Task = TaskSelect;

export const getTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => taskRepo.list());

export const createTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(taskInsertSchema)
  .handler(async ({ data }) => {
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
