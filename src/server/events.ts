import type { createEventStream } from "h3";

type EventStream = ReturnType<typeof createEventStream>;

const clients = new Set<EventStream>();

export const addClient = (stream: EventStream) => {
  clients.add(stream);
};

export const removeClient = (stream: EventStream) => {
  clients.delete(stream);
};

export const broadcastChange = () => {
  for (const stream of clients) {
    stream.push({ event: "tasks-changed", data: "" }).catch(() => {
      clients.delete(stream);
    });
  }
};
