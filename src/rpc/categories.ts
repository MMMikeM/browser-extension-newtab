import { createServerFn } from "@tanstack/react-start";
import { categorySelectSchema, categoryInsertSchema, categoryUpdateSchema } from "~/server/db/schema";
import { authMiddleware } from "~/lib/middleware";
import { notifyAll } from "./notify";
import categoryRepo from "~/server/db/category.repo";
import type { CategorySelect } from "~/server/db/category.repo";

export type Category = CategorySelect;

export const getCategories = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => categoryRepo.list());

export const createCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(categoryInsertSchema)
  .handler(async ({ data }) => {
    const result = await categoryRepo.insert(data);
    notifyAll();
    return result;
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(categoryUpdateSchema)
  .handler(async ({ data: { id, updatedAt, ...fields } }) => {
    const result = await categoryRepo.update(id, updatedAt, fields);
    notifyAll();
    return result;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(categorySelectSchema)
  .handler(async ({ data }) => {
    const result = await categoryRepo.remove(data.id);
    notifyAll();
    return result;
  });
