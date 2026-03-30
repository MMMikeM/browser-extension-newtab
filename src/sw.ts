/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { observable, syncState } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { IDB_CONFIG, API_TASKS_PATH, API_USERS_PATH, API_NOTES_PATH } from "~/lib/constants";

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

const modelPaths = [API_TASKS_PATH, API_USERS_PATH, API_NOTES_PATH];
const modelNames = ["tasks", "users", "notes"];

async function syncModel(apiPath: string, storeName: string) {
  const idbPlugin = observablePersistIndexedDB(IDB_CONFIG);

  const store$ = observable(
    synced({
      get: async () => {
        const res = await fetch(apiPath, { credentials: "include" });
        if (!res.ok) return {};
        const items = await res.json();
        const record: Record<string, unknown> = {};
        for (const item of items) {
          record[item.id] = item;
        }
        return record;
      },
      persist: {
        name: storeName,
        plugin: idbPlugin,
      },
      mode: "set",
    }),
  );

  await syncState(store$).sync();
}

async function backgroundSync() {
  await Promise.allSettled(modelPaths.map((path, i) => syncModel(path, modelNames[i])));
}

// Silent push: always sync to IDB (open tabs use SSE for real-time updates)
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json();
  if (data?.title !== "sync") return;
  event.waitUntil(backgroundSync());
});
