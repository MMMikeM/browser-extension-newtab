import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { getTasks, createTask, updateTask, deleteTask, type Task } from "~/rpc/tasks";
import { now } from "~/lib/utils";
import { getBuildTarget } from "~/lib/build-target";
import { IDB_CONFIG, TOKEN_KEY, SYNC_CHANNEL } from "~/lib/constants";

const isServer = typeof window === "undefined";

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

// Broadcast changes to other tabs in the same browser
const broadcastChange = !isServer ? new BroadcastChannel(SYNC_CHANNEL) : null;

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
      broadcastChange?.postMessage({ type: "sync" });
    },
    update: async ({ createdAt, updatedAt, ...input }) => {
      console.log("[sync] UPDATE fired for:", input.id);
      await updateTask({ data: { ...input, id: input.id!, updatedAt: now() } });
      broadcastChange?.postMessage({ type: "sync" });
    },
    delete: async ({ id }) => {
      console.log("[sync] DELETE fired for:", id);
      await deleteTask({ data: { id } });
      broadcastChange?.postMessage({ type: "sync" });
    },
    subscribe: ({ refresh }) => {
      if (isServer) return;

      // Cross-tab sync via BroadcastChannel (works in both browser and extension)
      const channel = new BroadcastChannel(SYNC_CHANNEL);
      channel.onmessage = () => refresh();

      // SW push sync (browser/PWA only)
      const swHandler =
        getBuildTarget() === "browser"
          ? (event: MessageEvent) => {
            if (event.data?.type === "SYNC_TASKS") refresh();
          }
          : null;

      if (swHandler) {
        navigator.serviceWorker?.addEventListener("message", swHandler);
      }

      return () => {
        channel.close();
        if (swHandler) {
          navigator.serviceWorker?.removeEventListener("message", swHandler);
        }
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
