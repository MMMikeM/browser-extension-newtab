import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { now } from "~/lib/utils";
import { createSyncInfrastructure } from "~/lib/sync/create-store";
import { MODELS } from "~/lib/sync/registry";
import { getCategories, createCategory, updateCategory, deleteCategory } from "~/rpc/categories";
import { getTasks, createTask, updateTask, deleteTask } from "~/rpc/tasks";
import { getUsers, createUser, updateUser, deleteUser } from "~/rpc/users";
import { getNotes, createNote, updateNote, deleteNote } from "~/rpc/notes";

const isNetworkError = (error: unknown): boolean =>
  error instanceof TypeError ||
  /network|fetch|timeout|ECONNRE|ENOTFOUND|abort/i.test(error instanceof Error ? error.message : String(error));

const rpcList = async <T>(fn: () => Promise<T[]>): Promise<T[]> => {
  try {
    return await fn();
  } catch (error) {
    console.error("[rpc]", error);
    if (isNetworkError(error)) throw error;
    return [];
  }
};

const rpc = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error("[rpc]", error);
    throw error;
  }
};

const [categoriesInfra, tasksInfra, usersInfra, notesInfra] = await Promise.all([
  createSyncInfrastructure(MODELS.categories),
  createSyncInfrastructure(MODELS.tasks),
  createSyncInfrastructure(MODELS.users),
  createSyncInfrastructure(MODELS.notes),
]);

export const categories$ = observable(
  syncedCrud({
    ...categoriesInfra,
    list: () => rpcList(() => getCategories()),
    create: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await rpc(() => createCategory({ data: { ...rest, createdAt: now() } }));
    },
    update: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await rpc(() => updateCategory({ data: { ...rest, id: input.id!, updatedAt: now() } }));
    },
    delete: async (input) => {
      await rpc(() => deleteCategory({ data: { id: input.id } }));
    },
  }),
);

export const tasks$ = observable(
  syncedCrud({
    ...tasksInfra,
    list: () => rpcList(() => getTasks()),
    create: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await rpc(() => createTask({ data: { ...rest, createdAt: now() } }));
    },
    update: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await rpc(() => updateTask({ data: { ...rest, id: input.id!, updatedAt: now() } }));
    },
    delete: async (input) => {
      await rpc(() => deleteTask({ data: { id: input.id } }));
    },
  }),
);

export const users$ = observable(
  syncedCrud({
    ...usersInfra,
    list: () => rpcList(() => getUsers()),
    create: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await rpc(() => createUser({ data: { ...rest, createdAt: now() } }));
    },
    update: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await rpc(() => updateUser({ data: { ...rest, id: input.id!, updatedAt: now() } }));
    },
    delete: async (input) => {
      await rpc(() => deleteUser({ data: { id: input.id } }));
    },
  }),
);

export const notes$ = observable(
  syncedCrud({
    ...notesInfra,
    list: () => rpcList(() => getNotes()),
    create: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await rpc(() => createNote({ data: { ...rest, createdAt: now() } }));
    },
    update: async (input) => {
      const { createdAt, updatedAt, ...rest } = input;
      await rpc(() => updateNote({ data: { ...rest, id: input.id!, updatedAt: now() } }));
    },
    delete: async (input) => {
      await rpc(() => deleteNote({ data: { id: input.id } }));
    },
  }),
);
