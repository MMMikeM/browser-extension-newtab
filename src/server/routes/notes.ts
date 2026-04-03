import { createRoute, z } from "@hono/zod-openapi";
import noteRepo, {
  noteInsertSchema,
  noteUpdateSchema,
  noteSelectSchema,
  noteResponseSchema,
} from "../db/note.repo";
import { authed } from "../middleware";
import { jsonBody, jsonContent, withAuth } from "./crud";

export const noteRoutes = authed()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      responses: withAuth({ 200: jsonContent(z.array(noteResponseSchema)) }),
    }),
    async (c) => c.json(await noteRepo.list(c.get("userId")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      request: jsonBody(noteInsertSchema),
      responses: withAuth({ 200: jsonContent(noteResponseSchema) }),
    }),
    async (c) => c.json(await noteRepo.insert(c.req.valid("json")), 200),
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/",
      request: jsonBody(noteUpdateSchema),
      responses: withAuth({ 200: jsonContent(noteResponseSchema) }),
    }),
    async (c) => {
      const { id, updatedAt, ...fields } = c.req.valid("json");
      return c.json(await noteRepo.update(id, updatedAt, fields), 200);
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/",
      request: jsonBody(noteSelectSchema),
      responses: withAuth({ 200: jsonContent(noteResponseSchema) }),
    }),
    async (c) => c.json(await noteRepo.remove(c.req.valid("json").id), 200),
  );
