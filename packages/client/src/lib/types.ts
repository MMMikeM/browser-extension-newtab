import type { TaskWithRelations } from "@newtab-todo/server/db/task.repo";
import type { CategoryWithOwner } from "@newtab-todo/server/db/category.repo";
import type { NoteSelect } from "@newtab-todo/server/db/note.repo";
import type { ContactWithUser } from "@newtab-todo/server/db/contact.repo";

export type Task = TaskWithRelations;
export type Category = CategoryWithOwner;
export type Note = NoteSelect;
export type Contact = ContactWithUser;
