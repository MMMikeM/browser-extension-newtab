import { useValue } from "@legendapp/state/react";
import { createId } from "@paralleldrive/cuid2";
import { notes$ } from "./store-notes";
import type { Note } from "~/rpc/notes";

export const useNotes = () => {
  const notesMap = useValue(notes$);
  const notes = notesMap
    ? (Object.values(notesMap) as Note[]).sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      )
    : [];
  return { data: notes };
};

export const useAddNote = () => ({
  add: (fields: Pick<Note, "title"> & Partial<Pick<Note, "content" | "taskId">>) => {
    const id = createId();
    notes$[id].set({ ...fields, id } as Note);
  },
});

export const useUpdateNote = () => ({
  mutate: ({ data: { id, ...fields } }: { data: { id: string; [k: string]: unknown } }) => {
    notes$[id].assign(fields);
  },
});

export const useDeleteNote = () => ({
  mutate: ({ data: { id } }: { data: { id: string } }) => {
    notes$[id]?.delete();
  },
});
