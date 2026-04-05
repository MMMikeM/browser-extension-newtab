import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { extractToken, validateSession } from "../auth";
import { registerClient, unregisterClient } from "../broadcast";

export const eventsRoute = new Hono().get("/", async (c) => {
  const token = extractToken(c.req.raw, new URL(c.req.url));
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  let userId: string;
  try {
    userId = await validateSession(token);
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return streamSSE(c, async (stream) => {
    const writer = {
      write: (event: string, data: string) => {
        stream.writeSSE({ event, data }).catch(() => {});
      },
      close: () => stream.close(),
    };

    registerClient(userId, writer);
    await stream.writeSSE({ retry: 3000, data: "" });

    const heartbeat = setInterval(() => {
      stream.writeSSE({ data: "", event: "heartbeat" }).catch(() => {
        clearInterval(heartbeat);
        unregisterClient(userId, writer);
      });
    }, 30_000);

    stream.onAbort(() => {
      clearInterval(heartbeat);
      unregisterClient(userId, writer);
    });

    // Keep stream open indefinitely
    await new Promise(() => {});
  });
});
