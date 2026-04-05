import type { Context } from "hono";
import { notifyOtherDevices } from "./push";
import type { MutationEvent, ModelName } from "@newtab-todo/shared";

export type { MutationEvent };

type SSEWriter = { write: (event: string, data: string) => void; close: () => void };

const sseClients = new Map<string, Set<SSEWriter>>();

export const registerClient = (userId: string, writer: SSEWriter) => {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId)!.add(writer);
};

export const unregisterClient = (userId: string, writer: SSEWriter) => {
  const set = sseClients.get(userId);
  if (!set) return;
  set.delete(writer);
  if (set.size === 0) sseClients.delete(userId);
};

export const notifyMutation = (event: MutationEvent, userIds: string[]) => {
  const payload = JSON.stringify(event);
  for (const uid of userIds) {
    for (const client of sseClients.get(uid) ?? []) {
      client.write("data-changed", payload);
    }
  }
  notifyOtherDevices(userIds).catch(() => {});
};

/** Broadcast a mutation event to the specified users, extracting sourceClientId from the request. */
export const broadcast = (
  c: Context,
  model: ModelName,
  action: MutationEvent["action"],
  data: object,
  userIds: string[],
) => {
  notifyMutation({ model, action, data, sourceClientId: c.req.header("x-client-id") }, userIds);
};
