import type { Context } from "hono";
import { notifyOtherDevices } from "./push";
import type { MutationEvent, ModelName } from "~/lib/constants";

export type { MutationEvent };

type SSEWriter = { write: (event: string, data: string) => void; close: () => void };

export const sseClients = new Set<SSEWriter>();

export const notifyMutation = (event: MutationEvent) => {
  const payload = JSON.stringify(event);
  for (const client of sseClients) {
    client.write("data-changed", payload);
  }
  notifyOtherDevices().catch(() => {});
};

/** Broadcast a mutation event, extracting sourceClientId from the request. */
export const broadcast = (
  c: Context,
  model: ModelName,
  action: MutationEvent["action"],
  data: object,
) => {
  notifyMutation({ model, action, data, sourceClientId: c.req.header("x-client-id") });
};
