import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { getTasks, createTask, updateTask, deleteTask } from "~/functions/tasks";

const idbPlugin = observablePersistIndexedDB({
  databaseName: "newtab-todo",
  version: 1,
  tableNames: ["tasks"],
});

const TOKEN_KEY = "newtab-todo-token";

export const authToken$ = observable<string | null>(
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY) authToken$.set(e.newValue);
  });
}

export const tasks$ = observable(
  syncedCrud({
    list: () => getTasks(),
    create: (input) => createTask({ data: input }),
    update: (input) => updateTask({ data: { ...input, updatedAt: new Date().toISOString() } }),
    delete: (input) => deleteTask({ data: { id: input.id } }),
    persist: {
      name: "tasks",
      plugin: idbPlugin,
      retrySync: true,
    },
    retry: { infinite: true, backoff: "exponential", maxDelay: 30 },
    fieldUpdatedAt: "updatedAt",
    fieldCreatedAt: "createdAt",
    waitForSet: authToken$,
  }),
);
