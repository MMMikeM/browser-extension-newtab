import { getAuthToken, subscribeAuthToken } from "~/lib/auth-token";
import { tasksCollection, categoriesCollection, notesCollection } from "~/lib/collections";
import { ensurePushRegistered } from "~/lib/push";
import { getBuildTarget } from "~/lib/build-target";
import { SSE_DATA_CHANGED, EVENTS_PATH } from "~/lib/constants";

let es: EventSource | null = null;

// TODO: Replace full refetch with incremental updates via directWrite API.
// Server should broadcast mutation details (model, action, data) instead of
// a generic "data-changed" event. Client applies surgically with
// collection.utils.writeUpdate/writeInsert/writeDelete.
const refetchAll = () => {
  tasksCollection.utils.refetch();
  categoriesCollection.utils.refetch();
  notesCollection.utils.refetch();
};

const connectSSE = () => {
  const token = getAuthToken();
  if (!token) return;

  const url = `${EVENTS_PATH}?token=${encodeURIComponent(token)}`;
  es = new EventSource(url);
  es.addEventListener(SSE_DATA_CHANGED, refetchAll);
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
    const type = (message as { type?: string })?.type;
    if (type?.startsWith("SYNC_")) refetchAll();
  });
};

export const initSync = () => {
  const target = getBuildTarget();
  if (target === "browser") {
    if (!es && getAuthToken()) connectSSE();
    subscribeAuthToken(reconnect);
  } else if (target === "extension") {
    listenExtensionMessages();
  }
};
