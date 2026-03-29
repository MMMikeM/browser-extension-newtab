import type { createEventStream } from "h3";
import { SSE_TASKS_CHANGED } from "~/lib/constants";

type EventStream = ReturnType<typeof createEventStream>;

const clients = new Set<EventStream>();

export const addClient = (stream: EventStream) => {
  clients.add(stream);
  console.log(`[sse] client connected (${clients.size} total)`);
};

export const removeClient = (stream: EventStream) => {
  clients.delete(stream);
  console.log(`[sse] client disconnected (${clients.size} remaining)`);
};

export const broadcastChange = () => {
  console.log(`[sse] broadcasting to ${clients.size} client(s)`);
  for (const stream of clients) {
    stream.push({ event: SSE_TASKS_CHANGED, data: "" }).catch(() => {
      console.log("[sse] push failed, closing stream");
      stream.close();
    });
  }
};
