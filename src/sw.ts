/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { IDB_CONFIG, API_PATH } from "~/lib/constants";

declare let self: ServiceWorkerGlobalScope;

// Precache static assets (injected by workbox-build)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigation: NetworkFirst with 3s timeout, fallback to cached HTML
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "pages-cache",
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  ),
);

// Static assets: CacheFirst
registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font",
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  }),
);

// Images: CacheFirst
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

// /_serverFn/* is NOT registered — Legend State handles sync/retry via IDB

// Skip waiting and claim clients immediately
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event: ExtendableEvent) =>
  event.waitUntil(self.clients.claim()),
);

/**
 * Fetch tasks from the API and write directly to Legend State's IDB store.
 *
 * Legend State uses: database "newtab-todo", object store "tasks", keyPath "id".
 * Each task is a separate record. We upsert by ID and remove tasks that no
 * longer exist on the server. Metadata keys (__legend_metadata) are preserved.
 */
const backgroundSync = async () => {
  const res = await fetch(API_PATH, { credentials: "include" });
  if (!res.ok) return;

  const tasks: { id: string }[] = await res.json();
  const serverIds = new Set(tasks.map((t) => t.id));

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(IDB_CONFIG.databaseName, IDB_CONFIG.version);
    req.onupgradeneeded = () => {
      for (const table of IDB_CONFIG.tableNames) {
        if (!req.result.objectStoreNames.contains(table)) {
          req.result.createObjectStore(table, { keyPath: "id" });
        }
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });

  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  // Upsert all server tasks
  for (const task of tasks) {
    store.put(task);
  }

  // Remove local tasks not on server (preserve metadata keys)
  const allKeys: IDBValidKey[] = await new Promise((resolve) => {
    const req = store.getAllKeys();
    req.onsuccess = () => resolve(req.result);
  });

  for (const key of allKeys) {
    if (typeof key === "string" && !key.includes("__legend") && !serverIds.has(key)) {
      store.delete(key);
    }
  }

  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
  });

  db.close();
};

// Silent push: sync tasks across devices
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json();
  if (data?.title !== "sync") return;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window" });

      if (clients.length > 0) {
        // App is open — Legend State's subscribe callback handles the refresh
        for (const client of clients) {
          client.postMessage({ type: "SYNC_TASKS" });
        }
      } else {
        // App is closed — write directly to IDB
        await backgroundSync();
      }
    })(),
  );
});
