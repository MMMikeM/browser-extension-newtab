import { defineHandler, createEventStream, getRequestURL } from "h3";
import { extractToken, validateToken } from "../auth";
import { addClient, removeClient } from "../events";

const HEARTBEAT_INTERVAL = 30_000;

export default defineHandler((event) => {
  const url = getRequestURL(event);
  const token = extractToken(event.req, url);
  if (!token) return new Response("Unauthorized", { status: 401 });

  try {
    validateToken(token);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = createEventStream(event);

  stream.push({ retry: 3000, data: "" });

  addClient(stream);

  const heartbeat = setInterval(() => {
    stream.pushComment("heartbeat").catch(() => {});
  }, HEARTBEAT_INTERVAL);

  stream.onClosed(() => {
    clearInterval(heartbeat);
    removeClient(stream);
  });

  return stream.send();
});
