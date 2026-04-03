import { zValidator } from "@hono/zod-validator";
import categoryRepo, {
  categoryInsertSchema,
  categoryUpdateSchema,
  categorySelectSchema,
} from "../db/category.repo";
import { authed } from "../middleware";

export const categoryRoutes = authed()
  .get("/", async (c) => c.json(await categoryRepo.list(c.get("userId"))))
  .post("/", zValidator("json", categoryInsertSchema), async (c) => {
    const result = await categoryRepo.insert(c.req.valid("json"));

    return c.json(result);
  })
  .put("/", zValidator("json", categoryUpdateSchema), async (c) => {
    const { id, updatedAt, ...fields } = c.req.valid("json");
    const result = await categoryRepo.update(id, updatedAt, fields);

    return c.json(result);
  })
  .delete("/", zValidator("json", categorySelectSchema), async (c) => {
    const { id } = c.req.valid("json");
    const result = await categoryRepo.remove(id);

    return c.json(result);
  });
