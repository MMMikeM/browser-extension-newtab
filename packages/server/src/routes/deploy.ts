import { Hono } from "hono";
import {
  sendPushNotification,
  type PushPayload as LibPushPayload,
  type VapidConfig,
} from "@mmmike/web-push";
import pushSubscriptionRepo from "../db/push-subscription.repo";

const vapid: VapidConfig = {
  subject: process.env.VAPID_SUBJECT!,
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

export const deployRoutes = new Hono();

deployRoutes.post("/notify", async (c) => {
  const secret = c.req.header("X-Deploy-Secret");
  if (!secret || secret !== process.env.DEPLOY_PUSH_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const subs = await pushSubscriptionRepo.findAll();
  const payload = { type: "deploy" } as unknown as LibPushPayload;

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
  console.log(`Deploy push: ${sent}/${results.length} delivered`);
  return c.json({ sent, total: results.length });
});
