import type { TaskWithRelations } from "~/server/db/task.repo";
import type { CategorySelect } from "~/server/db/category.repo";
import type { NoteSelect } from "~/server/db/note.repo";

export type Task = TaskWithRelations;
export type Category = CategorySelect;
export type Note = NoteSelect;
