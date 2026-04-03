import { zValidator } from "@hono/zod-validator";
import noteRepo, {
  noteInsertSchema,
  noteUpdateSchema,
  noteSelectSchema,
} from "../db/note.repo";
import { authed } from "../middleware";

export const noteRoutes = authed()
  .get("/", async (c) => c.json(await noteRepo.list(c.get("userId"))))
  .post("/", zValidator("json", noteInsertSchema), async (c) => {
    const result = await noteRepo.insert(c.req.valid("json"));

    return c.json(result);
  })
  .put("/", zValidator("json", noteUpdateSchema), async (c) => {
    const { id, updatedAt, ...fields } = c.req.valid("json");
    const result = await noteRepo.update(id, updatedAt, fields);

    return c.json(result);
  })
  .delete("/", zValidator("json", noteSelectSchema), async (c) => {
    const { id } = c.req.valid("json");
    const result = await noteRepo.remove(id);

    return c.json(result);
  });
