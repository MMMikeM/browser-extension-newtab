import { getAuthToken, subscribeAuthToken } from "~/lib/auth-token";
import { tasksCollection, categoriesCollection, notesCollection } from "~/lib/collections";
import { ensurePushRegistered } from "~/lib/push";
import { getBuildTarget } from "~/lib/build-target";
import { SSE_DATA_CHANGED, EVENTS_PATH } from "~/lib/constants";
import type { MutationEvent } from "~/lib/constants";

let es: EventSource | null = null;

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
  if (!token) return;

  const url = `${EVENTS_PATH}?token=${encodeURIComponent(token)}`;
  es = new EventSource(url);
  es.addEventListener(SSE_DATA_CHANGED, (e: MessageEvent) => {
    handleSSEData(e.data);
  });
  es.addEventListener("open", refetchAll);
};

const reconnect = () => {
  es?.close();
  es = null;
  if (getAuthToken()) {
    connectSSE();
    if (getBuildTarget() === "browser") ensurePushRegistered();
  }
};

const listenExtensionMessages = () => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { type?: string; payload?: MutationEvent };
    if (msg?.type === "SSE_MUTATION" && msg.payload) {
      applyMutation(msg.payload);
    } else if (msg?.type?.startsWith("SYNC_")) {
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
  }
};
