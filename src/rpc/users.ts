import { createServerFn } from "@tanstack/react-start";
import { userSelectSchema, userInsertSchema, userUpdateSchema } from "~/server/db/schema";
import { authMiddleware } from "~/lib/middleware";
import { notifyAll } from "./notify";
import userRepo from "~/server/db/user.repo";
import type { UserSelect } from "~/server/db/user.repo";

export type User = UserSelect;

export const getUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => userRepo.list());

export const createUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(userInsertSchema)
  .handler(async ({ data }) => {
    const result = await userRepo.insert(data);
    notifyAll();
    return result;
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(userUpdateSchema)
  .handler(async ({ data: { id, updatedAt, ...fields } }) => {
    const result = await userRepo.update(id, updatedAt, fields);
    notifyAll();
    return result;
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(userSelectSchema)
  .handler(async ({ data }) => {
    const result = await userRepo.remove(data.id);
    notifyAll();
    return result;
  });
