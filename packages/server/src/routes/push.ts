import { createRoute, z } from "@hono/zod-openapi";
import pushSubscriptionRepo from "../db/push-subscription.repo";
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
      await pushSubscriptionRepo.upsert({ ...c.req.valid("json"), userId: c.get("userId") });
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
      await pushSubscriptionRepo.remove(c.req.valid("json").endpoint);
      return c.json({ ok: true as const }, 200);
    },
  );
