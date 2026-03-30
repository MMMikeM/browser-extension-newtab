import { defineHandler, createEventStream, getRequestURL } from "h3";
import { extractToken, validateToken } from "../auth";
import { onDataChanged } from "../events";
import { SSE_DATA_CHANGED } from "~/lib/constants";

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

  const unhook = onDataChanged(() => {
    stream.push({ event: SSE_DATA_CHANGED, data: "" }).catch(() => stream.close());
  });

  const heartbeat = setInterval(() => {
    stream.pushComment("heartbeat").catch(() => stream.close());
  }, HEARTBEAT_INTERVAL);

  stream.onClosed(() => {
    clearInterval(heartbeat);
    unhook();
    console.log("[sse] client disconnected");
  });

  console.log("[sse] client connected");

  return stream.send();
});
