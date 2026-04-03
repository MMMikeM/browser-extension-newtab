import { createRoute, z } from "@hono/zod-openapi";
import categoryRepo, {
  categoryInsertSchema,
  categoryUpdateSchema,
  categorySelectSchema,
  categoryResponseSchema,
} from "../db/category.repo";
import { authed } from "../middleware";
import { jsonBody, jsonContent, withAuth } from "./crud";

export const categoryRoutes = authed()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      responses: withAuth({ 200: jsonContent(z.array(categoryResponseSchema)) }),
    }),
    async (c) => c.json(await categoryRepo.list(c.get("userId")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      request: jsonBody(categoryInsertSchema),
      responses: withAuth({ 200: jsonContent(categoryResponseSchema) }),
    }),
    async (c) => c.json(await categoryRepo.insert(c.req.valid("json")), 200),
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/",
      request: jsonBody(categoryUpdateSchema),
      responses: withAuth({ 200: jsonContent(categoryResponseSchema) }),
    }),
    async (c) => {
      const { id, updatedAt, ...fields } = c.req.valid("json");
      return c.json(await categoryRepo.update(id, updatedAt, fields), 200);
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/",
      request: jsonBody(categorySelectSchema),
      responses: withAuth({ 200: jsonContent(categoryResponseSchema) }),
    }),
    async (c) => c.json(await categoryRepo.remove(c.req.valid("json").id), 200),
  );
