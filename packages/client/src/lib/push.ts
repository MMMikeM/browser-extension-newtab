import { client } from "~/lib/api";

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const registerPushSubscription = async (vapidPublicKey: string): Promise<boolean> => {
  console.log("[push] registering, vapidKey length:", vapidPublicKey?.length);

  if (typeof window === "undefined") {
    console.log("[push] skip: no window");
    return false;
  }
  if (location.protocol.endsWith("-extension:")) {
    console.log("[push] skip: extension");
    return false;
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("[push] skip: no SW/PushManager");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("[push] permission:", permission);
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    console.log("[push] SW ready, subscribing...");

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    });

    const json = subscription.toJSON();
    console.log("[push] subscribed, sending to server...");

    await client.api.push.subscribe.$post({
      json: {
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!,
      },
    });

    console.log("[push] registered successfully");
    return true;
  } catch (err) {
    console.error("[push] registration failed:", err);
    return false;
  }
};

export const unregisterPushSubscription = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await client.api.push.unsubscribe.$post({ json: { endpoint } });
    console.log("[push] unregistered");
  } catch (err) {
    console.error("[push] unregister failed:", err);
  }
};

export const isPushSubscribed = async (): Promise<boolean> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
};

export const ensurePushRegistered = async (): Promise<void> => {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
  if (!vapidKey) {
    console.warn("[push] no VITE_VAPID_PUBLIC_KEY");
    return;
  }

  const alreadySubscribed = await isPushSubscribed();
  if (alreadySubscribed) {
    console.log("[push] already subscribed");
    return;
  }

  await registerPushSubscription(vapidKey);
};
