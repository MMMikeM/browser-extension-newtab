import { observable, syncState } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import {
  IDB_CONFIG,
  TOKEN_KEY,
  API_PATH,
  EVENTS_PATH,
  SSE_TASKS_CHANGED,
  MSG_SYNC_TASKS,
  MSG_TOKEN_CHANGED,
} from "~/lib/constants";

declare const __SERVER_URL__: string;

let syncTimer: ReturnType<typeof setTimeout> | null = null;

const debouncedSync = () => {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncTasks().catch((err) => console.error("[bg-sse] sync error:", err));
  }, 300);
};

const syncTasks = async () => {
  const result = await browser.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];
  if (!token) {
    console.log("[bg-sync] no token, skipping");
    return;
  }

  console.log("[bg-sync] fetching tasks...");
  const res = await fetch(`${__SERVER_URL__}${API_PATH}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("[bg-sync] fetch failed:", res.status);
    return;
  }

  const tasks: { id: string }[] = await res.json();
  const record: Record<string, unknown> = {};
  for (const task of tasks) {
    record[task.id] = task;
  }

  const idbPlugin = observablePersistIndexedDB(IDB_CONFIG);
  const tasks$ = observable(
    synced({
      get: () => record,
      persist: { name: "tasks", plugin: idbPlugin },
      mode: "set",
    }),
  );

  await syncState(tasks$).sync();
  console.log("[bg-sync] synced", tasks.length, "tasks to IDB");

  // Notify open extension tabs to refresh from IDB
  browser.runtime.sendMessage({ type: MSG_SYNC_TASKS }).catch(() => {});
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

  eventSource.addEventListener(SSE_TASKS_CHANGED, () => {
    console.log("[bg-sse] tasks-changed event received");
    debouncedSync();
  });

  eventSource.addEventListener("open", () => {
    console.log("[bg-sse] connected, running initial sync");
    syncTasks().catch((err) => console.error("[bg-sse] initial sync error:", err));
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
