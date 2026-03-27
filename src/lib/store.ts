import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { getTasks, createTask, updateTask, deleteTask } from "~/functions/tasks";

const isServer = typeof window === "undefined";
const TOKEN_KEY = "newtab-todo-token";

export const authToken$ = observable<string | null>(
  isServer ? null : localStorage.getItem(TOKEN_KEY),
);

if (!isServer) {
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY) authToken$.set(e.newValue);
  });
}

let idbPlugin: any = undefined;
if (!isServer) {
  const { observablePersistIndexedDB } = await import("@legendapp/state/persist-plugins/indexeddb");
  idbPlugin = observablePersistIndexedDB({
    databaseName: "newtab-todo",
    version: 1,
    tableNames: ["tasks"],
  });
}

export const tasks$ = observable(
  syncedCrud({
    list: async () => {
      if (!authToken$.peek()) return [];
      try {
        return await getTasks();
      } catch {
        return [];
      }
    },
    create: async (input) => {
      await createTask({ data: input });
    },
    update: async (input) => {
      await updateTask({ data: { ...input, id: input.id!, updatedAt: new Date().toISOString() } });
    },
    delete: async (input) => {
      await deleteTask({ data: { id: input.id } });
    },
    ...(idbPlugin
      ? {
          persist: {
            name: "tasks",
            plugin: idbPlugin,
            retrySync: true,
          },
        }
      : {}),
    initial: {} as Record<string, any>,
    retry: {
      infinite: true,
      backoff: "exponential",
      maxDelay: 60,
      delay: 1000,
    },
    fieldUpdatedAt: "updatedAt",
    fieldCreatedAt: "createdAt",
    waitForSet: authToken$,
  }),
);
