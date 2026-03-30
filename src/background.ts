import { observable, syncState } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import {
  IDB_CONFIG,
  TOKEN_KEY,
  EVENTS_PATH,
  SSE_DATA_CHANGED,
  MSG_TOKEN_CHANGED,
  API_TASKS_PATH,
  API_USERS_PATH,
  API_NOTES_PATH,
  MSG_SYNC_TASKS,
  MSG_SYNC_USERS,
  MSG_SYNC_NOTES,
} from "~/lib/constants";

declare const __SERVER_URL__: string;

interface ModelDescriptor {
  name: string;
  apiPath: string;
  syncMessage: string;
}

const models: ModelDescriptor[] = [
  { name: "tasks", apiPath: API_TASKS_PATH, syncMessage: MSG_SYNC_TASKS },
  { name: "users", apiPath: API_USERS_PATH, syncMessage: MSG_SYNC_USERS },
  { name: "notes", apiPath: API_NOTES_PATH, syncMessage: MSG_SYNC_NOTES },
];

let syncTimer: ReturnType<typeof setTimeout> | null = null;

const debouncedSyncAll = () => {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncAllModels().catch((err) => console.error("[bg-sync] sync error:", err));
  }, 300);
};

const syncModel = async (model: ModelDescriptor) => {
  const result = await browser.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];
  if (!token) return;

  const res = await fetch(`${__SERVER_URL__}${model.apiPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`[bg-sync] fetch ${model.name} failed:`, res.status);
    return;
  }

  const items: { id: string }[] = await res.json();
  const record: Record<string, unknown> = {};
  for (const item of items) {
    record[item.id] = item;
  }

  const idbPlugin = observablePersistIndexedDB(IDB_CONFIG);
  const store$ = observable(
    synced({
      get: () => record,
      persist: { name: model.name, plugin: idbPlugin },
      mode: "set",
    }),
  );

  await syncState(store$).sync();
  console.log(`[bg-sync] synced ${items.length} ${model.name} to IDB`);

  browser.runtime.sendMessage({ type: model.syncMessage }).catch(() => {});
};

const syncAllModels = async () => {
  const result = await browser.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];
  if (!token) {
    console.log("[bg-sync] no token, skipping");
    return;
  }

  await Promise.allSettled(models.map(syncModel));
};

// SSE connection management
let eventSource: EventSource | null = null;

const connect = async () => {
  eventSource?.close();
  eventSource = null;

  const result = await browser.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];
  if (!token) {
    console.log("[bg-sse] no token, not connecting");
    return;
  }

  const url = `${__SERVER_URL__}${EVENTS_PATH}?token=${encodeURIComponent(token)}`;
  console.log("[bg-sse] connecting...");
  eventSource = new EventSource(url);

  eventSource.addEventListener(SSE_DATA_CHANGED, () => {
    console.log("[bg-sse] data-changed event received");
    debouncedSyncAll();
  });

  eventSource.addEventListener("open", () => {
    console.log("[bg-sse] connected, running initial sync");
    syncAllModels().catch((err) => console.error("[bg-sse] initial sync error:", err));
  });

  eventSource.onerror = () => {
    console.log("[bg-sse] connection error, will auto-reconnect");
  };
};

// Listen for token changes from extension tabs
browser.runtime.onMessage.addListener((message: unknown) => {
  if ((message as { type?: string })?.type === MSG_TOKEN_CHANGED) {
    console.log("[bg-sse] token changed, reconnecting");
    connect().catch((err) => console.error("[bg-sse] reconnect error:", err));
  }
});

// Connect on background page load
connect().catch((err) => console.error("[bg-sse] initial connect error:", err));

console.log("[bg-sse] persistent background page loaded");
