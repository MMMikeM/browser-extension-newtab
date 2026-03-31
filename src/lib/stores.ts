import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { now } from "~/lib/utils";
import { createSyncInfrastructure } from "~/lib/sync/create-store";
import { MODELS } from "~/lib/sync/registry";
import { getTasks, createTask, updateTask, deleteTask } from "~/rpc/tasks";
import { getUsers, createUser, updateUser, deleteUser } from "~/rpc/users";
import { getNotes, createNote, updateNote, deleteNote } from "~/rpc/notes";

const [tasksInfra, usersInfra, notesInfra] = await Promise.all([
  createSyncInfrastructure(MODELS.tasks),
  createSyncInfrastructure(MODELS.users),
  createSyncInfrastructure(MODELS.notes),
]);

export const tasks$ = observable(
  syncedCrud({
    ...tasksInfra,
    list: async () => getTasks(),
    create: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await createTask({ data: { ...rest, createdAt: now() } });
    },
    update: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await updateTask({ data: { ...rest, id: input.id!, updatedAt: now() } });
    },
    delete: async (input) => {
      await deleteTask({ data: { id: input.id } });
    },
  }),
);

export const users$ = observable(
  syncedCrud({
    ...usersInfra,
    list: async () => getUsers(),
    create: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await createUser({ data: { ...rest, createdAt: now() } });
    },
    update: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await updateUser({ data: { ...rest, id: input.id!, updatedAt: now() } });
    },
    delete: async (input) => {
      await deleteUser({ data: { id: input.id } });
    },
  }),
);

export const notes$ = observable(
  syncedCrud({
    ...notesInfra,
    list: async () => getNotes(),
    create: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await createNote({ data: { ...rest, createdAt: now() } });
    },
    update: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await updateNote({ data: { ...rest, id: input.id!, updatedAt: now() } });
    },
    delete: async (input) => {
      await deleteNote({ data: { id: input.id } });
    },
  }),
);
