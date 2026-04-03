import { createMiddleware } from "hono/factory";
import { notifyOtherDevices } from "./push";

type SSEWriter = { write: (event: string) => void; close: () => void };

export const sseClients = new Set<SSEWriter>();

const broadcastChange = () => {
  for (const client of sseClients) {
    client.write("data-changed");
  }
};

/** Broadcast to SSE clients + send web push to offline devices. */
export const notifyAll = () => {
  broadcastChange();
  notifyOtherDevices().catch(() => {});
};

const SKIP_NOTIFY = ["/api/auth/", "/api/push/", "/api/events/"];

/** Middleware: calls notifyAll() after successful mutations (POST/PUT/DELETE).
 *  Skips auth, push, and events routes. */
export const autoNotify = createMiddleware(async (c, next) => {
  await next();
  if (SKIP_NOTIFY.some((p) => c.req.path.startsWith(p))) return;
  if (c.req.method !== "GET" && c.res.status < 300) {
    notifyAll();
  }
});
