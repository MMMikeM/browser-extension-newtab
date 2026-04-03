import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db/client";
import { pushSubscriptions } from "../db/schema";
import { authed } from "../middleware";
import { okSchema } from "./openapi-schemas";

const subscriptionSchema = z.object({
  endpoint: z.url(),
  p256dh: z.string(),
  auth: z.string(),
});

const subscribePush = createRoute({
  method: "post",
  path: "/subscribe",
  request: { body: { content: { "application/json": { schema: subscriptionSchema } } } },
  responses: {
    200: {
      description: "Subscribed",
      content: { "application/json": { schema: okSchema } },
    },
  },
});

const unsubscribePush = createRoute({
  method: "post",
  path: "/unsubscribe",
  request: {
    body: { content: { "application/json": { schema: z.object({ endpoint: z.string() }) } } },
  },
  responses: {
    200: {
      description: "Unsubscribed",
      content: { "application/json": { schema: okSchema } },
    },
  },
});

export const pushRoutes = authed()
  .openapi(subscribePush, async (c) => {
    const data = c.req.valid("json");
    await db
      .insert(pushSubscriptions)
      .values({ id: createId(), ...data })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: data });
    return c.json({ ok: true as const }, 200);
  })
  .openapi(unsubscribePush, async (c) => {
    const { endpoint } = c.req.valid("json");
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return c.json({ ok: true as const }, 200);
  });
