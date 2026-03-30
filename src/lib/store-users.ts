import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { getUsers, createUser, updateUser, deleteUser } from "~/rpc/users";
import { now } from "~/lib/utils";
import { getBuildTarget } from "~/lib/build-target";
import { subscribeSSE } from "~/lib/sse";
import { authToken$ } from "~/lib/auth-token";
import { IDB_CONFIG, MSG_SYNC_USERS } from "~/lib/constants";

const isServer = typeof window === "undefined";

const createPersist = async () => {
  if (typeof window === "undefined") return undefined;
  const { observablePersistIndexedDB } = await import("@legendapp/state/persist-plugins/indexeddb");
  return {
    name: "users",
    plugin: observablePersistIndexedDB(IDB_CONFIG),
    retrySync: true,
  };
};

export const users$ = observable(
  syncedCrud({
    list: async () => {
      if (!authToken$.peek()) return [];
      try {
        return await getUsers();
      } catch {
        return [];
      }
    },
    create: async ({ createdAt: _createdAt, updatedAt: _updatedAt, ...input }) => {
      console.log("[sync:users] CREATE fired for:", input.id);
      await createUser({ data: { ...input, createdAt: now() } });
    },
    update: async ({ createdAt: _createdAt, updatedAt: _updatedAt, ...input }) => {
      console.log("[sync:users] UPDATE fired for:", input.id);
      await updateUser({ data: { ...input, id: input.id!, updatedAt: now() } });
    },
    delete: async ({ id }) => {
      console.log("[sync:users] DELETE fired for:", id);
      await deleteUser({ data: { id } });
    },
    subscribe: ({ refresh }) => {
      if (isServer) return;

      const target = getBuildTarget();

      const bgHandler =
        target === "extension"
          ? (message: unknown) => {
              if ((message as { type?: string })?.type === MSG_SYNC_USERS) {
                console.log("[sync:users] background sync received, refreshing");
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
    onError: (error) => console.error("[sync:users] error:", error),
    waitForSet: authToken$,
  }),
);
