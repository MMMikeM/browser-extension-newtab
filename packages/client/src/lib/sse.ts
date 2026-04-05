import { useSyncExternalStore } from "react";
import { getAuthToken, subscribeAuthToken } from "~/lib/auth-token";
import { tasksCollection, categoriesCollection, notesCollection } from "~/lib/collections";
import { ensurePushRegistered } from "~/lib/push";
import { getBuildTarget } from "~/lib/build-target";
import { SSE_DATA_CHANGED, EVENTS_PATH, MSG_GET_STATUS, MSG_BG_STATUS } from "~/lib/constants";
import type { MutationEvent } from "~/lib/constants";
import { createExternalStore } from "~/lib/external-store";
import { offline } from "~/lib/offline";

let es: EventSource | null = null;

export type SyncState = "disconnected" | "connecting" | "connected";
const syncStateStore = createExternalStore<SyncState>("disconnected");
export const useSyncState = syncStateStore.useStore;

// ─── Pending mutations ────────────────────────────────────────────────────────
// Polls the offline executor for unreconciled optimistic writes.
// Lazy: interval only runs while at least one component is subscribed.

let pendingSnapshot = 0;
const pendingListeners = new Set<() => void>();
let pendingInterval: ReturnType<typeof setInterval> | null = null;

const subscribePending = (cb: () => void) => {
  pendingListeners.add(cb);
  if (pendingListeners.size === 1) {
    pendingInterval = setInterval(() => {
      const next = offline.getPendingCount() + offline.getRunningCount();
      if (next !== pendingSnapshot) {
        pendingSnapshot = next;
        pendingListeners.forEach((fn) => fn());
      }
    }, 200);
  }
  return () => {
    pendingListeners.delete(cb);
    if (pendingListeners.size === 0 && pendingInterval !== null) {
      clearInterval(pendingInterval);
      pendingInterval = null;
    }
  };
};

/** True while any optimistic mutations have not yet been confirmed by the server. */
export const usePendingMutations = () =>
  useSyncExternalStore(subscribePending, () => pendingSnapshot) > 0;

const collectionMap = {
  tasks: tasksCollection,
  categories: categoriesCollection,
  notes: notesCollection,
} as const;

const refetchAll = () => {
  tasksCollection.utils.refetch();
  categoriesCollection.utils.refetch();
  notesCollection.utils.refetch();
};

const applyMutation = (event: MutationEvent) => {
  console.log(`[sse] received ${event.model}.${event.action}`, event.data);
  const collection = collectionMap[event.model];
  if (!collection) {
    console.log("[sse] unknown model, refetching all");
    refetchAll();
    return;
  }

  switch (event.action) {
    case "insert":
      console.log(`[sse] writeUpsert → ${event.model}`);
      collection.utils.writeUpsert(event.data as never);
      break;
    case "update":
      console.log(`[sse] writeUpdate → ${event.model}`);
      collection.utils.writeUpdate(event.data as never);
      break;
    case "delete":
      console.log(`[sse] writeDelete → ${event.model}`);
      collection.utils.writeDelete((event.data as { id: string }).id);
      break;
    default:
      console.log(`[sse] unknown action ${event.action}, refetching all`);
      refetchAll();
  }
};

const handleSSEData = (data: string) => {
  if (!data) {
    refetchAll();
    return;
  }
  try {
    const event = JSON.parse(data) as MutationEvent;
    applyMutation(event);
  } catch {
    refetchAll();
  }
};

const connectSSE = () => {
  const token = getAuthToken();
  if (!token) {
    syncStateStore.set("disconnected");
    return;
  }

  syncStateStore.set("connecting");
  const url = `${EVENTS_PATH}?token=${encodeURIComponent(token)}`;
  es = new EventSource(url);
  es.addEventListener(SSE_DATA_CHANGED, (e: MessageEvent) => {
    handleSSEData(e.data);
  });
  es.addEventListener("open", () => {
    syncStateStore.set("connected");
    refetchAll();
  });
  es.addEventListener("error", () => {
    syncStateStore.set("connecting");
  });
};

const reconnect = () => {
  es?.close();
  es = null;
  syncStateStore.set("disconnected");
  if (getAuthToken()) {
    connectSSE();
    if (getBuildTarget() === "browser") ensurePushRegistered();
  }
};

const listenExtensionMessages = () => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { type?: string; payload?: MutationEvent };
    if (msg?.type === "SSE_MUTATION" && msg.payload) {
      // Any message from the background page means the SSE connection is alive.
      syncStateStore.set("connected");
      applyMutation(msg.payload);
    } else if (msg?.type?.startsWith("SYNC_")) {
      syncStateStore.set("connected");
      refetchAll();
    }
  });
};

const listenSwMessages = () => {
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "SYNC_ALL") refetchAll();
  });
};

export const initSync = () => {
  const target = getBuildTarget();
  if (target === "browser") {
    if (!es && getAuthToken()) connectSSE();
    subscribeAuthToken(reconnect);
    listenSwMessages();
  } else if (target === "extension") {
    listenExtensionMessages();
    // Probe the background page for its current SSE connection state so the
    // indicator isn't stuck at "Offline" on fresh tab load.
    browser.runtime
      .sendMessage({ type: MSG_GET_STATUS })
      .then((resp: unknown) => {
        const r = resp as { type?: string; connected?: boolean };
        if (r?.type === MSG_BG_STATUS && r.connected) syncStateStore.set("connected");
      })
      .catch(() => {}); // background not yet ready — first SYNC_* message will update state
  }
};
