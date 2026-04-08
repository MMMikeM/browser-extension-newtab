import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { createInsertSchema } from "drizzle-orm/zod";
import { z } from "@hono/zod-openapi";
import { db } from "./client";
import { pushSubscriptions } from "./schema";

export const pushSubscriptionInsertSchema = createInsertSchema(pushSubscriptions)
  .omit({ createdAt: true, id: true })
  .required();

export type PushSubscriptionInsert = z.infer<typeof pushSubscriptionInsertSchema>;

const upsert = async (data: PushSubscriptionInsert) => {
  await db
    .insert(pushSubscriptions)
    .values({ id: createId(), ...data })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: data });
};

const remove = async (endpoint: string) => {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
};

// Returns subscriptions for the given users. Rows with userId = null are legacy
// (pre-3B) — included as a safe fallback until they re-register.
const findForUsers = async (userIds: string[]) =>
  db.query.pushSubscriptions.findMany({
    where: { OR: [{ userId: { in: userIds } }, { userId: { isNull: true } }] },
  });

const findAll = async () => db.query.pushSubscriptions.findMany();

export default { upsert, remove, findForUsers, findAll };
