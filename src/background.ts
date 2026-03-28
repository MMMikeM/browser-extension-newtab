import { observable, syncState } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { IDB_CONFIG, TOKEN_KEY, API_PATH } from "~/lib/constants";

declare const __SERVER_URL__: string;

const ALARM_NAME = "sync-tasks";
const SYNC_INTERVAL_MINUTES = 1; // minimum for MV2, increase to 5 after testing

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
  browser.runtime.sendMessage({ type: "SYNC_TASKS" }).catch(() => {});

};

// Register periodic alarm
browser.alarms.create(ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    syncTasks().catch((err) => console.error("[bg-sync] alarm error:", err));
  }
});

// Sync immediately on event page wake
syncTasks().catch((err) => console.error("[bg-sync] initial sync error:", err));

console.log("[bg-sync] event page loaded, alarm set for every", SYNC_INTERVAL_MINUTES, "minutes");
