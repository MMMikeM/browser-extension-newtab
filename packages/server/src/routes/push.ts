import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db/client";
import { pushSubscriptions } from "../db/schema";
import { authed } from "../middleware";
import { okSchema } from "./openapi-schemas";
import { jsonBody, jsonContent, withAuth } from "./crud";

const subscriptionSchema = z.object({
  endpoint: z.url(),
  p256dh: z.string(),
  auth: z.string(),
});

export const pushRoutes = authed()
  .openapi(
    createRoute({
      method: "post",
      path: "/subscribe",
      request: jsonBody(subscriptionSchema),
      responses: withAuth({ 200: jsonContent(okSchema) }),
    }),
    async (c) => {
      const data = c.req.valid("json");
      await db
        .insert(pushSubscriptions)
        .values({ id: createId(), ...data })
        .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: data });
      return c.json({ ok: true as const }, 200);
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/unsubscribe",
      request: jsonBody(z.object({ endpoint: z.string() })),
      responses: withAuth({ 200: jsonContent(okSchema) }),
    }),
    async (c) => {
      const { endpoint } = c.req.valid("json");
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      return c.json({ ok: true as const }, 200);
    },
  );
