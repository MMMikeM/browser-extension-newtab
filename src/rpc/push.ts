import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { db } from "~/server/db/client";
import { pushSubscriptions } from "~/server/db/schema";
import { authMiddleware } from "~/lib/middleware";

const subscriptionSchema = z.object({
  endpoint: z.url(),
  p256dh: z.string(),
  auth: z.string(),
});

export const subscribePush = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(subscriptionSchema)
  .handler(async ({ data }) => {
    await db
      .insert(pushSubscriptions)
      .values({ id: createId(), ...data })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: data });
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ endpoint: z.string() }))
  .handler(async ({ data }) => {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, data.endpoint));
  });
