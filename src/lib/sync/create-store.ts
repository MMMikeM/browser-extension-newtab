import type { SyncedSubscribeParams } from "@legendapp/state/sync";
import { getBuildTarget } from "~/lib/build-target";
import { subscribeSSE } from "~/lib/sse";
import { authToken$ } from "~/lib/auth-token";
import type { SyncModel } from "./types";
import { IDB_CONFIG } from "./registry";

const isServer = typeof window === "undefined";

const createPersist = async (name: string) => {
  if (isServer) return undefined;
  const { observablePersistIndexedDB } = await import("@legendapp/state/persist-plugins/indexeddb");
  return { name, plugin: observablePersistIndexedDB(IDB_CONFIG), retrySync: true };
};

const createSyncSubscribe =
  (model: SyncModel) =>
  ({ refresh }: SyncedSubscribeParams): (() => void) | void => {
    if (isServer) return;
    const target = getBuildTarget();

    const bgHandler =
      target === "extension"
        ? (message: unknown) => {
            if ((message as { type?: string })?.type === model.syncMessage) refresh();
          }
        : null;

    if (bgHandler) browser.runtime.onMessage.addListener(bgHandler);
    const unsubSSE = target === "browser" ? subscribeSSE(refresh) : null;

    return () => {
      if (bgHandler) browser.runtime.onMessage.removeListener(bgHandler);
      unsubSSE?.();
    };
  };

export const createSyncInfrastructure = async (model: SyncModel) => ({
  subscribe: createSyncSubscribe(model),
  persist: await createPersist(model.name),
  initial: {},
  retry: { infinite: true, backoff: "exponential" as const, maxDelay: 60, delay: 1000 },
  fieldUpdatedAt: "updatedAt" as const,
  fieldCreatedAt: "createdAt" as const,
  onError: (error: Error) => console.error(`[sync:${model.name}] error:`, error),
  waitForSet: authToken$,
});
