/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

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

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event: ExtendableEvent) =>
  event.waitUntil(self.clients.claim()),
);

// Push: notify all open clients to invalidate their React Query cache
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json();
  if (data?.title !== "sync") return;
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "SYNC_ALL" });
      }
    }),
  );
});
