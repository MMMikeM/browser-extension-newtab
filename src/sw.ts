/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { observable, syncState } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { IDB_CONFIG, API_PATH } from "~/sync/config";

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
 * Fetch tasks via /api/tasks (cookie auth sent automatically) and write
 * to Legend State's IDB store. Used when push arrives and no clients are open.
 */
async function backgroundSync() {
  const idbPlugin = observablePersistIndexedDB(IDB_CONFIG);

  const tasks$ = observable(
    synced({
      get: async () => {
        const res = await fetch(API_PATH, { credentials: "include" });
        if (!res.ok) return {};
        const tasks = await res.json();
        // Convert array to Record<id, task> (Legend State's syncedCrud format)
        const record: Record<string, unknown> = {};
        for (const task of tasks) {
          record[task.id] = task;
        }
        return record;
      },
      persist: {
        name: "tasks",
        plugin: idbPlugin,
      },
      mode: "set",
    }),
  );

  // Trigger the fetch + IDB write
  await syncState(tasks$).sync();
}

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
        // App is closed — fetch and write to IDB via Legend State
        await backgroundSync();
      }
    })(),
  );
});
