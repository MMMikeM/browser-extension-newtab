import type { SyncedSubscribeParams } from "@legendapp/state/sync";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { getBuildTarget } from "~/lib/build-target";
import { subscribeSSE } from "~/lib/sse";
import { authToken$ } from "~/lib/auth-token";
import type { SyncModel } from "./types";
import { IDB_CONFIG } from "./registry";

const createSyncSubscribe =
  (model: SyncModel) =>
  ({ refresh }: SyncedSubscribeParams): (() => void) => {
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
  persist: { name: model.name, plugin: observablePersistIndexedDB(IDB_CONFIG), retrySync: true },
  initial: {},
  retry: { infinite: true, backoff: "exponential" as const, maxDelay: 30, delay: 1000 },
  fieldUpdatedAt: "updatedAt" as const,
  fieldCreatedAt: "createdAt" as const,
  onError: (error: Error) => console.error(`[sync:${model.name}]`, error),
  waitForSet: authToken$,
});
