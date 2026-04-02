import { observe } from "@legendapp/state";
import { authToken$ } from "~/lib/auth-token";
import { SSE_DATA_CHANGED, EVENTS_PATH } from "~/lib/constants";

type Listener = () => void;

const listeners = new Set<Listener>();
let es: EventSource | null = null;

const connect = () => {
  if (!authToken$.peek()) return;

  es = new EventSource(EVENTS_PATH);
  es.addEventListener(SSE_DATA_CHANGED, () => {
    listeners.forEach((fn) => fn());
  });
  es.addEventListener("open", () => {
    listeners.forEach((fn) => fn());
  });
};

observe(() => {
  authToken$.get();
  es?.close();
  es = null;
  connect();
});

export const subscribeSSE = (onRefresh: Listener): (() => void) => {
  listeners.add(onRefresh);
  if (!es) connect();
  return () => {
    listeners.delete(onRefresh);
    if (listeners.size === 0) {
      es?.close();
      es = null;
    }
  };
};
