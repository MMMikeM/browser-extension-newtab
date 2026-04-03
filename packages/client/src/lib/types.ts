import type { TaskWithRelations } from "@newtab-todo/server/db/task.repo";
import type { CategorySelect } from "@newtab-todo/server/db/category.repo";
import type { NoteSelect } from "@newtab-todo/server/db/note.repo";

export type Task = TaskWithRelations;
export type Category = CategorySelect;
export type Note = NoteSelect;
