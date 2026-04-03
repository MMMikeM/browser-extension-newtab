import { createRoute, z } from "@hono/zod-openapi";
import categoryRepo, {
  categoryInsertSchema,
  categoryUpdateSchema,
  categorySelectSchema,
  categoryResponseSchema,
} from "../db/category.repo";
import { authed } from "../middleware";
import { broadcast } from "../broadcast";
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
    async (c) => {
      const result = await categoryRepo.insert(c.req.valid("json"));
      broadcast(c, "categories", "insert", result);
      return c.json(result, 200);
    },
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
      const result = await categoryRepo.update(id, updatedAt, fields);
      broadcast(c, "categories", "update", result);
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/",
      request: jsonBody(categorySelectSchema),
      responses: withAuth({ 200: jsonContent(categoryResponseSchema) }),
    }),
    async (c) => {
      const result = await categoryRepo.remove(c.req.valid("json").id);
      broadcast(c, "categories", "delete", { id: result.id });
      return c.json(result, 200);
    },
  );
