import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db/client";
import { pushSubscriptions } from "../db/schema";
import { authed } from "../middleware";

const subscriptionSchema = z.object({
  endpoint: z.url(),
  p256dh: z.string(),
  auth: z.string(),
});

export const pushRoutes = authed()
  .post("/subscribe", zValidator("json", subscriptionSchema), async (c) => {
    const data = c.req.valid("json");
    await db
      .insert(pushSubscriptions)
      .values({ id: createId(), ...data })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: data });
    return c.json({ ok: true });
  })
  .post(
    "/unsubscribe",
    zValidator("json", z.object({ endpoint: z.string() })),
    async (c) => {
      const { endpoint } = c.req.valid("json");
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      return c.json({ ok: true });
    },
  );
