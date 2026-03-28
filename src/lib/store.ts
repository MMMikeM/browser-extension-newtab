import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { getTasks, createTask, updateTask, deleteTask } from "~/functions/tasks";
import { getBuildTarget } from "~/lib/build-target";
import { IDB_CONFIG } from "~/sync/config";

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

const createPersist = async () => {
  if (typeof window === "undefined") return undefined;
  const { observablePersistIndexedDB } = await import("@legendapp/state/persist-plugins/indexeddb");
  return {
    name: "tasks",
    plugin: observablePersistIndexedDB(IDB_CONFIG),
    retrySync: true,
  };
};

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
    subscribe: ({ refresh }) => {
      if (getBuildTarget() !== "browser") return;
      // SW sends SYNC_TASKS when a silent push arrives from another device
      const handler = (event: MessageEvent) => {
        if (event.data?.type === "SYNC_TASKS") refresh();
      };
      navigator.serviceWorker?.addEventListener("message", handler);
      return () => navigator.serviceWorker?.removeEventListener("message", handler);
    },
    persist: await createPersist(),
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
