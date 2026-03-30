import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { getTasks, createTask, updateTask, deleteTask, type Task } from "~/rpc/tasks";
import { now } from "~/lib/utils";
import { getBuildTarget } from "~/lib/build-target";
import { subscribeSSE } from "~/lib/sse";
import { authToken$ } from "~/lib/auth-token";
import { IDB_CONFIG, MSG_SYNC_TASKS } from "~/lib/constants";

const isServer = typeof window === "undefined";

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
    create: async ({ createdAt: _createdAt, updatedAt: _updatedAt, ...input }) => {
      console.log("[sync:tasks] CREATE fired for:", input.id);
      await createTask({ data: { ...input, createdAt: now() } });
    },
    update: async ({ createdAt: _createdAt, updatedAt: _updatedAt, ...input }) => {
      console.log("[sync:tasks] UPDATE fired for:", input.id);
      await updateTask({ data: { ...input, id: input.id!, updatedAt: now() } });
    },
    delete: async ({ id }) => {
      console.log("[sync:tasks] DELETE fired for:", id);
      await deleteTask({ data: { id } });
    },
    subscribe: ({ refresh }) => {
      if (isServer) return;

      const target = getBuildTarget();

      const bgHandler =
        target === "extension"
          ? (message: unknown) => {
              if ((message as { type?: string })?.type === MSG_SYNC_TASKS) {
                console.log("[sync:tasks] background sync received, refreshing");
                refresh();
              }
            }
          : null;

      if (bgHandler) {
        browser.runtime.onMessage.addListener(bgHandler);
      }

      const unsubSSE = target === "browser" ? subscribeSSE(refresh) : null;

      return () => {
        if (bgHandler) browser.runtime.onMessage.removeListener(bgHandler);
        unsubSSE?.();
      };
    },
    persist: await createPersist(),
    initial: {},
    retry: {
      infinite: true,
      backoff: "exponential",
      maxDelay: 60,
      delay: 1000,
    },
    fieldUpdatedAt: "updatedAt",
    fieldCreatedAt: "createdAt",
    onError: (error) => console.error("[sync:tasks] error:", error),
    waitForSet: authToken$,
  }),
);
