import { TOKEN_KEY, EVENTS_PATH, SSE_DATA_CHANGED, MSG_TOKEN_CHANGED, MODEL_NAMES } from "~/lib/constants";

declare const __SERVER_URL__: string;

const notifyTabsFallback = () => {
  for (const model of MODEL_NAMES) {
    browser.runtime.sendMessage({ type: `SYNC_${model.toUpperCase()}` }).catch(() => {});
  }
};

let eventSource: EventSource | null = null;

const connect = async () => {
  eventSource?.close();
  eventSource = null;

  const result = await browser.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];
  if (!token) {
    console.log("[bg-sse] no token, not connecting");
    return;
  }

  const url = `${__SERVER_URL__}${EVENTS_PATH}?token=${encodeURIComponent(token)}`;
  console.log("[bg-sse] connecting...");
  eventSource = new EventSource(url);

  eventSource.addEventListener(SSE_DATA_CHANGED, (e: MessageEvent) => {
    console.log("[bg-sse] data-changed event received");
    if (e.data) {
      try {
        const payload = JSON.parse(e.data);
        browser.runtime.sendMessage({ type: "SSE_MUTATION", payload }).catch(() => {});
        return;
      } catch {
        // fall through to generic notify
      }
    }
    notifyTabsFallback();
  });

  eventSource.addEventListener("open", () => {
    console.log("[bg-sse] connected");
    notifyTabsFallback();
  });

  eventSource.onerror = () => {
    console.log("[bg-sse] connection error, will auto-reconnect");
  };
};

browser.runtime.onMessage.addListener((message: unknown) => {
  if ((message as { type?: string })?.type === MSG_TOKEN_CHANGED) {
    console.log("[bg-sse] token changed, reconnecting");
    connect().catch((err) => console.error("[bg-sse] reconnect error:", err));
  }
});

connect().catch((err) => console.error("[bg-sse] initial connect error:", err));

console.log("[bg-sse] persistent background page loaded");
