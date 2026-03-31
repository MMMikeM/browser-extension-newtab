import { createServerFn } from "@tanstack/react-start";
import { noteSelectSchema, noteInsertSchema, noteUpdateSchema } from "~/server/db/schema";
import { authMiddleware } from "~/lib/middleware";
import { notifyAll } from "./notify";
import noteRepo from "~/server/db/note.repo";
import type { NoteSelect } from "~/server/db/note.repo";

export type Note = NoteSelect;

export const getNotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => noteRepo.list());

export const createNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(noteInsertSchema)
  .handler(async ({ data }) => {
    const result = await noteRepo.insert(data);
    notifyAll();
    return result;
  });

export const updateNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(noteUpdateSchema)
  .handler(async ({ data: { id, updatedAt, ...fields } }) => {
    const result = await noteRepo.update(id, updatedAt, fields);
    notifyAll();
    return result;
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(noteSelectSchema)
  .handler(async ({ data }) => {
    const result = await noteRepo.remove(data.id);
    notifyAll();
    return result;
  });
