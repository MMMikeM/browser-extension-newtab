// Probe-only MV3 background. Chrome runs it as a service worker, Firefox as an event page.
import { TOKEN_KEY } from "~/lib/constants";
import { PROBE_SUBSCRIBE_PUSH, RUN_PROBE, runProbe, vapidKeyBytes } from "~/probe/probe";

declare const __SERVER_URL__: string;

type Message = { type?: string; token?: string | null; vapidKey?: string };
type ExtApi = {
  runtime: {
    onInstalled: { addListener(listener: () => void): void };
    onStartup: { addListener(listener: () => void): void };
    onMessage: {
      addListener(
        listener: (
          message: Message,
          sender: unknown,
          sendResponse: (response: unknown) => void,
        ) => boolean | void,
      ): void;
    };
  };
  storage: { local: { get(key: string): Promise<Record<string, unknown>> } };
};

const g = globalThis as unknown as Record<string, unknown>;
// Chrome exposes only `chrome`; Firefox exposes both
const ext = (g.browser ?? g.chrome) as ExtApi;
const registration = g.registration as ServiceWorkerRegistration | undefined;

const storedToken = async () =>
  ((await ext.storage.local.get(TOKEN_KEY))[TOKEN_KEY] as string | undefined) ?? null;

const probe = async (trigger: string, token?: string | null) =>
  runProbe({
    label: "ext-bg (mv3)",
    trigger,
    apiBase: __SERVER_URL__,
    token: token ?? (await storedToken()),
  });

const subscribeToSilentPush = async (token: string | null | undefined, vapidKey: string) => {
  if (!registration) {
    return { ok: false, detail: "not a service worker, so no push here" };
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: false,
    applicationServerKey: vapidKeyBytes(vapidKey),
  });
  const { endpoint, keys } = subscription.toJSON();
  const res = await fetch(`${__SERVER_URL__}/api/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ endpoint, p256dh: keys?.p256dh, auth: keys?.auth }),
  });
  return {
    ok: res.ok,
    detail: `subscribed with userVisibleOnly: false; server said HTTP ${res.status}`,
  };
};

ext.runtime.onInstalled.addListener(() => void probe("install"));
ext.runtime.onStartup.addListener(() => void probe("startup"));

ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === RUN_PROBE) {
    probe("message", message.token).then(sendResponse, (err) =>
      sendResponse({ error: String(err) }),
    );
    return true;
  }
  if (message?.type === PROBE_SUBSCRIBE_PUSH && message.vapidKey) {
    subscribeToSilentPush(message.token, message.vapidKey).then(sendResponse, (err) =>
      sendResponse({ ok: false, detail: String(err) }),
    );
    return true;
  }
});

// Chrome only wakes the worker for events whose listeners were added on its first evaluation
if (registration) {
  globalThis.addEventListener("push", (event) => {
    (event as ExtendableEvent).waitUntil(probe("push"));
  });
}
