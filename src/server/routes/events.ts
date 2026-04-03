import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { extractToken, validateSession } from "../auth";
import { sseClients } from "../broadcast";

export const eventsRoute = new Hono().get("/", async (c) => {
  const token = extractToken(c.req.raw, new URL(c.req.url));
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  try {
    await validateSession(token);
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return streamSSE(c, async (stream) => {
    const writer = {
      write: (event: string) => {
        stream.writeSSE({ event, data: "" }).catch(() => {});
      },
      close: () => stream.close(),
    };

    sseClients.add(writer);
    await stream.writeSSE({ retry: 3000, data: "" });

    const heartbeat = setInterval(() => {
      stream.writeSSE({ data: "", event: "heartbeat" }).catch(() => {
        clearInterval(heartbeat);
        sseClients.delete(writer);
      });
    }, 30_000);

    stream.onAbort(() => {
      clearInterval(heartbeat);
      sseClients.delete(writer);
    });

    // Keep stream open indefinitely
    await new Promise(() => {});
  });
});
