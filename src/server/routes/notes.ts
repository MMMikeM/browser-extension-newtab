import { createRoute, z } from "@hono/zod-openapi";
import noteRepo, {
  noteInsertSchema,
  noteUpdateSchema,
  noteSelectSchema,
  noteResponseSchema,
} from "../db/note.repo";
import { authed } from "../middleware";
import { unauthorizedResponse } from "./openapi-schemas";

const listNotes = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      description: "List all notes",
      content: { "application/json": { schema: z.array(noteResponseSchema) } },
    },
    401: unauthorizedResponse,
  },
});

const createNote = createRoute({
  method: "post",
  path: "/",
  request: { body: { content: { "application/json": { schema: noteInsertSchema } } } },
  responses: {
    200: {
      description: "Created note",
      content: { "application/json": { schema: noteResponseSchema } },
    },
    401: unauthorizedResponse,
  },
});

const updateNote = createRoute({
  method: "put",
  path: "/",
  request: { body: { content: { "application/json": { schema: noteUpdateSchema } } } },
  responses: {
    200: {
      description: "Updated note",
      content: { "application/json": { schema: noteResponseSchema } },
    },
    401: unauthorizedResponse,
  },
});

const deleteNote = createRoute({
  method: "delete",
  path: "/",
  request: { body: { content: { "application/json": { schema: noteSelectSchema } } } },
  responses: {
    200: {
      description: "Deleted note",
      content: { "application/json": { schema: noteResponseSchema } },
    },
    401: unauthorizedResponse,
  },
});

export const noteRoutes = authed()
  .openapi(listNotes, async (c) => {
    const result = await noteRepo.list(c.get("userId"));
    return c.json(result, 200);
  })
  .openapi(createNote, async (c) => {
    const data = c.req.valid("json");
    const result = await noteRepo.insert(data);
    return c.json(result, 200);
  })
  .openapi(updateNote, async (c) => {
    const { id, updatedAt, ...fields } = c.req.valid("json");
    const result = await noteRepo.update(id, updatedAt, fields);
    return c.json(result, 200);
  })
  .openapi(deleteNote, async (c) => {
    const { id } = c.req.valid("json");
    const result = await noteRepo.remove(id);
    return c.json(result, 200);
  });
