import { sendPushNotification, type VapidConfig } from "@mmmike/web-push";
import pushSubscriptionRepo from "./db/push-subscription.repo";

const vapid: VapidConfig = {
  subject: process.env.VAPID_SUBJECT!,
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

export const notifyOtherDevices = async (userIds: string[], excludeEndpoint?: string) => {
  const allSubs = await pushSubscriptionRepo.findForUsers(userIds);
  const subs = excludeEndpoint ? allSubs.filter((s) => s.endpoint !== excludeEndpoint) : allSubs;

  const payload = { title: "sync", body: "tasks updated" };

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        vapid,
      );
      if (!ok) await pushSubscriptionRepo.remove(sub.endpoint);
      return ok;
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  if (results.length > 0) {
    console.log(`Push: ${sent}/${results.length} delivered`);
  }
};
