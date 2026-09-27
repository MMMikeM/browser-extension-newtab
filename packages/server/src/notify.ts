import {
  sendPushNotification,
  type PushPayload as LibPushPayload,
  type VapidConfig,
} from "@mmmike/web-push";
import pushSubscriptionRepo from "./db/push-subscription.repo";
import userRepo from "./db/user.repo";
import type { PushPayload } from "@newtab-todo/shared";

const vapid: VapidConfig = {
  subject: process.env.VAPID_SUBJECT!,
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

/**
 * Send a typed push notification to a single user's devices.
 * Fire-and-forget — failures are logged, not thrown. Expired subs are cleaned up.
 */
export const sendNotification = async (userId: string, payload: PushPayload) => {
  const subs = await pushSubscriptionRepo.findForUsers([userId]);
  if (subs.length === 0) return { sent: 0, total: 0 };

  // The library JSON.stringifies whatever payload it receives; the SW parses our typed union.
  // Cast to the library's PushPayload type to satisfy TypeScript.
  const wirePayload = payload as unknown as LibPushPayload;

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        wirePayload,
        vapid,
      );
      if (!ok) await pushSubscriptionRepo.remove(sub.endpoint);
      return ok;
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  console.log(`Notification [${payload.type}] to ${userId}: ${sent}/${results.length} delivered`);
  return { sent, total: results.length };
};

/**
 * Look up a user's display name by ID. Returns "Someone" if lookup fails.
 */
export const getUserName = async (userId: string): Promise<string> => {
  try {
    const user = await userRepo.findById(userId);
    return user.name;
  } catch {
    return "Someone";
  }
};
