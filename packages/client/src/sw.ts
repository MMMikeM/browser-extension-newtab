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

// Map push payload type to notification display properties
const getNotification = (
  payload: Record<string, unknown>,
): { title: string; body: string; url: string } | null => {
  const p = payload as Record<string, string>;
  switch (payload.type) {
    case "task-shared":
      return {
        title: p.fromUser,
        body: `Shared "${p.taskTitle}" with you`,
        url: `#/tasks/${p.taskId}`,
      };
    case "task-updated":
      return {
        title: p.fromUser,
        body: `Updated "${p.taskTitle}": ${p.changes}`,
        url: `#/tasks/${p.taskId}`,
      };
    case "task-assigned":
      return {
        title: p.fromUser,
        body: `Assigned "${p.taskTitle}" to you`,
        url: `#/tasks/${p.taskId}`,
      };
    case "task-completed":
      return { title: p.byUser, body: `Completed "${p.taskTitle}"`, url: `#/tasks/${p.taskId}` };
    case "category-shared":
      return {
        title: p.fromUser,
        body: `Shared category "${p.categoryName}" with you`,
        url: `#/categories/${p.categoryId}`,
      };
    case "contact-accepted":
      return {
        title: "Ajot",
        body: `${p.contactName} accepted your contact request`,
        url: "#/settings",
      };
    case "reminder-due":
      return { title: "Reminder", body: `"${p.taskTitle}" is due`, url: `#/tasks/${p.taskId}` };
    case "overdue-digest": {
      const tasks = (payload as { tasks?: unknown[] }).tasks ?? [];
      return {
        title: "Overdue tasks",
        body: `You have ${tasks.length} overdue task${tasks.length === 1 ? "" : "s"}`,
        url: "#/",
      };
    }
    default:
      return null;
  }
};

// Push: handle typed payloads — show visible notification or silent sync
self.addEventListener("push", (event: PushEvent) => {
  const payload = event.data?.json();
  if (!payload?.type) return;

  // Silent sync — notify open clients to invalidate cache
  if (payload.type === "sync") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "SYNC_ALL" });
        }
      }),
    );
    return;
  }

  // Visible notification — also trigger sync in open clients
  const notification = getNotification(payload);
  if (!notification) return;

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: "/icons/icon-192.png",
        data: { url: notification.url },
      }),
      self.clients.matchAll().then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "SYNC_ALL" });
        }
      }),
    ]),
  );
});

// Click: focus existing window or open new one at the notification's target URL
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? "#/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Try to focus an existing window
      for (const client of clients) {
        if ("focus" in client) {
          (client as WindowClient).focus();
          (client as WindowClient).navigate(new URL(url, self.location.origin).href);
          return;
        }
      }
      // No existing window — open a new one
      return self.clients.openWindow(url);
    }),
  );
});
