/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { observable, syncState } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { keyById } from "~/lib/utils";
import { MODELS, IDB_CONFIG } from "~/lib/sync/registry";
import type { SyncModel } from "~/lib/sync/types";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event: ExtendableEvent) =>
  event.waitUntil(self.clients.claim()),
);

const idbPlugin = observablePersistIndexedDB(IDB_CONFIG);

const syncModel = async (model: SyncModel) => {
  const store$ = observable(
    synced({
      get: async () => {
        const res = await fetch(model.apiPath, { credentials: "include" });
        if (!res.ok) return {};
        const items = await res.json();
        return keyById(items);
      },
      persist: {
        name: model.name,
        plugin: idbPlugin,
      },
      mode: "set",
    }),
  );

  await syncState(store$).sync();
};

const backgroundSync = async () => {
  await Promise.allSettled(Object.values(MODELS).map(syncModel));
};

// Silent push: always sync to IDB (open tabs use SSE for real-time updates)
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json();
  if (data?.title !== "sync") return;
  event.waitUntil(backgroundSync());
});
