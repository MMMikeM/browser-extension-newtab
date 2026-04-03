import { createRoute, z } from "@hono/zod-openapi";
import categoryRepo, {
  categoryInsertSchema,
  categoryUpdateSchema,
  categorySelectSchema,
  categoryResponseSchema,
} from "../db/category.repo";
import { authed } from "../middleware";

const listCategories = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      description: "List all categories",
      content: { "application/json": { schema: z.array(categoryResponseSchema) } },
    },
  },
});

const createCategory = createRoute({
  method: "post",
  path: "/",
  request: { body: { content: { "application/json": { schema: categoryInsertSchema } } } },
  responses: {
    200: {
      description: "Created category",
      content: { "application/json": { schema: categoryResponseSchema } },
    },
  },
});

const updateCategory = createRoute({
  method: "put",
  path: "/",
  request: { body: { content: { "application/json": { schema: categoryUpdateSchema } } } },
  responses: {
    200: {
      description: "Updated category",
      content: { "application/json": { schema: categoryResponseSchema } },
    },
  },
});

const deleteCategory = createRoute({
  method: "delete",
  path: "/",
  request: { body: { content: { "application/json": { schema: categorySelectSchema } } } },
  responses: {
    200: {
      description: "Deleted category",
      content: { "application/json": { schema: categoryResponseSchema } },
    },
  },
});

export const categoryRoutes = authed()
  .openapi(listCategories, async (c) => {
    const result = await categoryRepo.list(c.get("userId"));
    return c.json(result, 200);
  })
  .openapi(createCategory, async (c) => {
    const data = c.req.valid("json");
    const result = await categoryRepo.insert(data);
    return c.json(result, 200);
  })
  .openapi(updateCategory, async (c) => {
    const { id, updatedAt, ...fields } = c.req.valid("json");
    const result = await categoryRepo.update(id, updatedAt, fields);
    return c.json(result, 200);
  })
  .openapi(deleteCategory, async (c) => {
    const { id } = c.req.valid("json");
    const result = await categoryRepo.remove(id);
    return c.json(result, 200);
  });
