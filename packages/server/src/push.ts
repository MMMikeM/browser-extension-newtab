import { eq } from "drizzle-orm";
import { sendPushNotification, type VapidConfig } from "@mmmike/web-push";
import { db } from "./db/client";
import { pushSubscriptions } from "./db/schema";

const vapid: VapidConfig = {
  subject: process.env.VAPID_SUBJECT!,
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

/**
 * Send a silent sync push to all devices except the one that made the change.
 * Expired/invalid subscriptions (410 Gone) are cleaned up automatically.
 */
export const notifyOtherDevices = async (excludeEndpoint?: string) => {
  const subs = await db.query.pushSubscriptions.findMany(
    excludeEndpoint ? { where: { NOT: { endpoint: excludeEndpoint } } } : undefined,
  );

  const payload = { title: "sync", body: "tasks updated" };

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        vapid,
      );
      if (!ok) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
      }
      return ok;
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  if (results.length > 0) {
    console.log(`Push: ${sent}/${results.length} delivered`);
  }
};
