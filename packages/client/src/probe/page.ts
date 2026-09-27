import { TOKEN_KEY } from "~/lib/constants";
import {
  PROBE_DONE,
  PROBE_SUBSCRIBE_PUSH,
  RUN_PROBE,
  clearReports,
  readReports,
  runProbe,
  summarise,
  vapidKeyBytes,
  type ProbeReport,
} from "./probe";

type ExtApi = {
  runtime: {
    sendMessage(message: unknown): Promise<unknown>;
    getManifest(): { manifest_version: number };
  };
  storage: { local: { set(items: Record<string, unknown>): Promise<void> } };
};

const g = globalThis as unknown as Record<string, unknown>;
const ext = (g.browser ?? g.chrome) as ExtApi | undefined;
const isExtension = location.protocol.endsWith("-extension:");
const manifestVersion = isExtension ? (ext?.runtime.getManifest().manifest_version ?? null) : null;
// Extension pages aren't served by the API server, so they need its absolute URL
const apiBase = isExtension ? import.meta.env.SERVER_URL : "";
const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const pageLabel = isExtension ? `ext-page (mv${manifestVersion})` : "pwa-page";

const byId = (id: string) => document.getElementById(id)!;

const log = (...parts: unknown[]) => {
  const line = parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join(" ");
  console.log("[probe-page]", line);
  const logEl = byId("log");
  logEl.textContent = `${new Date().toLocaleTimeString()} ${line}\n${logEl.textContent}`;
};

const getToken = () => localStorage.getItem(TOKEN_KEY);

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const renderReport = (report: ProbeReport) => {
  const card = document.createElement("div");
  card.className = "card";
  const title = document.createElement("h3");
  title.textContent = report.label;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = [
    report.trigger,
    new Date(report.at).toLocaleString(),
    report.scope,
    report.origin,
    report.manifestVersion ? `MV${report.manifestVersion}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  card.append(title, meta);
  for (const [name, check] of Object.entries(report.checks)) {
    const row = document.createElement("div");
    row.className = `check ${check.ok ? "ok" : "fail"}`;
    row.textContent = `${check.ok ? "✓" : "✗"} ${name}: ${check.detail}`;
    card.append(row);
  }
  return card;
};

const renderReports = async () => {
  const reports = (await readReports()).sort((a, b) => a.label.localeCompare(b.label));
  const section = byId("reports");
  section.replaceChildren(...reports.map(renderReport));
  if (!reports.length) section.textContent = "No results yet.";
};

const action = (label: string, run: () => Promise<void>) => {
  const button = document.createElement("button");
  button.textContent = label;
  button.addEventListener("click", () => {
    button.disabled = true;
    run()
      .catch((err) => log(`${label} failed:`, String(err)))
      .finally(() => {
        button.disabled = false;
      });
  });
  byId("actions").append(button);
};

const runHere = async () => {
  const report = await runProbe({ label: pageLabel, trigger: "button", apiBase, token: getToken() });
  log(`${pageLabel}: ${summarise(report)}`);
  await renderReports();
};

const sendTestPush = async () => {
  const res = await fetch(`${apiBase}/api/push/probe`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
  });
  log(`test push: HTTP ${res.status}`, await res.json().catch(() => null));
};

// Registers the app's worker if this browser never opened the app itself
const activeRegistration = async () => {
  if (!("serviceWorker" in navigator)) throw new Error("no service worker support");
  if (!(await navigator.serviceWorker.getRegistration())) {
    await navigator.serviceWorker.register("/sw.js").catch((err) => {
      throw new Error(`couldn't register /sw.js (the dev server has none): ${err}`);
    });
  }
  return navigator.serviceWorker.ready;
};

const runInServiceWorker = async () => {
  const registration = await activeRegistration();
  registration.active!.postMessage({ type: RUN_PROBE });
  log("asked the service worker to run");
};

const subscribeThisBrowser = async () => {
  if (!vapidKey) throw new Error("VITE_VAPID_PUBLIC_KEY isn't set in this build");
  const registration = await activeRegistration();
  if ((await Notification.requestPermission()) !== "granted") {
    throw new Error("notification permission refused");
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyBytes(vapidKey),
  });
  const { endpoint, keys } = subscription.toJSON();
  const res = await fetch(`${apiBase}/api/push/subscribe`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ endpoint, p256dh: keys?.p256dh, auth: keys?.auth }),
  });
  log(`subscribed this browser; server said HTTP ${res.status}`);
};

const runInBackground = async () => {
  const report = (await ext!.runtime.sendMessage({ type: RUN_PROBE, token: getToken() })) as
    | ProbeReport
    | undefined;
  log(report ? `background: ${summarise(report)}` : "background didn't answer");
  await renderReports();
};

const subscribeBackground = async () => {
  if (!vapidKey) throw new Error("VITE_VAPID_PUBLIC_KEY isn't set in this build");
  const result = await ext!.runtime.sendMessage({
    type: PROBE_SUBSCRIBE_PUSH,
    token: getToken(),
    vapidKey,
  });
  log("background push subscription:", result);
};

const signIn = async (form: HTMLFormElement) => {
  const data = new FormData(form);
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
  });
  if (!res.ok) throw new Error(`sign-in failed: HTTP ${res.status}`);
  const { token } = (await res.json()) as { token: string };
  localStorage.setItem(TOKEN_KEY, token);
  // The extension backgrounds read the token from extension storage, not localStorage
  if (isExtension) await ext!.storage.local.set({ [TOKEN_KEY]: token });
  location.reload();
};

byId("env").textContent = [
  pageLabel,
  location.origin,
  `API ${apiBase || "same origin"}`,
  getToken() ? "signed in" : "signed out",
].join(" · ");

const form = byId("signin") as HTMLFormElement;
form.hidden = !!getToken();
form.addEventListener("submit", (event) => {
  event.preventDefault();
  signIn(form).catch((err) => log(String(err)));
});

action("Run here", runHere);
if (isExtension) {
  action("Run in background", runInBackground);
  if (manifestVersion === 3) action("Subscribe background to silent push", subscribeBackground);
} else {
  action("Run in service worker", runInServiceWorker);
  action("Subscribe this browser to push", subscribeThisBrowser);
}
action("Send test push", sendTestPush);
action("Refresh", renderReports);
action("Clear results", async () => {
  await clearReports();
  await renderReports();
});

navigator.serviceWorker?.addEventListener("message", (event) => {
  if (event.data?.type !== PROBE_DONE) return;
  const report = event.data.report as ProbeReport;
  log(`service worker (${report.trigger}): ${summarise(report)}`);
  void renderReports();
});
// A push can land while this page is in the background
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void renderReports();
});

void renderReports();
