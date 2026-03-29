import { observable, observe } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { getTasks, createTask, updateTask, deleteTask, type Task } from "~/rpc/tasks";
import { now } from "~/lib/utils";
import { getBuildTarget } from "~/lib/build-target";
import { ensurePushRegistered } from "~/lib/push";
import { IDB_CONFIG, TOKEN_KEY } from "~/lib/constants";

const isServer = typeof window === "undefined";

export const authToken$ = observable<string | null>(
  isServer ? null : localStorage.getItem(TOKEN_KEY),
);

if (!isServer) {
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY) authToken$.set(e.newValue);
  });

  const target = getBuildTarget();

  // Auto-register push when token is set (browser context only)
  if (target === "browser") {
    observe(() => {
      if (authToken$.get()) ensurePushRegistered();
    });
  }

  // Migrate token to browser.storage.local for background script access
  if (target === "extension") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) browser.storage.local.set({ [TOKEN_KEY]: token });
  }
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
    create: async ({ createdAt, updatedAt, ...input }) => {
      console.log("[sync] CREATE fired for:", input.id);
      await createTask({ data: { ...input, createdAt: now() } });
    },
    update: async ({ createdAt, updatedAt, ...input }) => {
      console.log("[sync] UPDATE fired for:", input.id);
      await updateTask({ data: { ...input, id: input.id!, updatedAt: now() } });
    },
    delete: async ({ id }) => {
      console.log("[sync] DELETE fired for:", id);
      await deleteTask({ data: { id } });
    },
    subscribe: ({ refresh }) => {
      if (isServer) return;

      const target = getBuildTarget();

      // Extension: background page notifies tabs via runtime messages
      const bgHandler =
        target === "extension"
          ? (message: unknown) => {
              if ((message as { type?: string })?.type === "SYNC_TASKS") {
                console.log("[sync] background SSE sync received, refreshing");
                refresh();
              }
            }
          : null;

      if (bgHandler) {
        browser.runtime.onMessage.addListener(bgHandler);
      }

      // Browser: direct SSE connection for real-time updates
      let es: EventSource | null = null;
      let disposed = false;

      const connectSSE = () => {
        if (disposed || target !== "browser") return;
        const token = authToken$.peek();
        if (!token) return;

        es = new EventSource("/api/events");
        es.addEventListener("tasks-changed", () => {
          console.log("[sync] SSE tasks-changed, refreshing");
          refresh();
        });
        es.addEventListener("open", () => refresh());
      };

      // Track token changes to reconnect SSE
      const stopObserving =
        target === "browser"
          ? observe(() => {
              authToken$.get();
              es?.close();
              es = null;
              connectSSE();
            })
          : null;

      return () => {
        disposed = true;
        if (bgHandler) browser.runtime.onMessage.removeListener(bgHandler);
        stopObserving?.();
        es?.close();
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
    onError: (error) => console.error("[sync] error:", error),
    waitForSet: authToken$,
  }),
);
