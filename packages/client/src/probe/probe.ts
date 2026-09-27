// Background-sync capability probe. Runs unchanged in pages, the PWA service worker and both
// extension backgrounds, so it uses no app modules and nothing but platform APIs.

export const RUN_PROBE = "RUN_PROBE";
export const PROBE_DONE = "PROBE_DONE";
export const PROBE_SUBSCRIBE_PUSH = "PROBE_SUBSCRIBE_PUSH";

export type ProbeCheck = { ok: boolean; detail: string };

export type ProbeReport = {
  label: string;
  trigger: string;
  at: string;
  scope: string;
  origin: string;
  manifestVersion: number | null;
  checks: Record<string, ProbeCheck>;
};

export type ProbeOptions = {
  label: string;
  trigger: string;
  apiBase: string;
  token?: string | null;
};

type ExtApi = {
  runtime?: { getManifest?: () => { manifest_version: number } };
  alarms?: unknown;
};

const DB_NAME = "ajot-probe";
const CACHE_NAME = "ajot-probe";
const CHECK_TIMEOUT_MS = 8000;

const g = globalThis as unknown as Record<string, unknown>;
const ext = (g.browser ?? g.chrome) as ExtApi | undefined;

const isInstance = (ctorName: string) => {
  const ctor = g[ctorName];
  return typeof ctor === "function" && globalThis instanceof (ctor as abstract new () => unknown);
};

const scopeName = () => {
  if (isInstance("ServiceWorkerGlobalScope")) return "service worker";
  if (isInstance("WorkerGlobalScope")) return "worker";
  if (typeof window !== "undefined") return "window";
  return "unknown";
};

const manifestVersion = () => {
  try {
    return ext?.runtime?.getManifest?.().manifest_version ?? null;
  } catch {
    return null;
  }
};

const withTimeout = <T>(promise: Promise<T>) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${CHECK_TIMEOUT_MS}ms`)), CHECK_TIMEOUT_MS),
    ),
  ]);

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("markers", { keyPath: "label" });
      request.result.createObjectStore("reports", { keyPath: "label" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("open blocked by another connection"));
  });

const idbRequest = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const inStore = async <T>(
  store: "markers" | "reports",
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
) => {
  const db = await openDb();
  try {
    return await idbRequest(run(db.transaction(store, mode).objectStore(store)));
  } finally {
    db.close();
  }
};

const seenList = (labels: string[]) => (labels.length ? labels.sort().join(", ") : "nothing");

const checks: Record<string, (options: ProbeOptions, at: string) => Promise<string>> = {
  indexedDB: async ({ label }, at) => {
    await inStore("markers", "readwrite", (s) => s.put({ label, at }));
    const markers = await inStore("markers", "readonly", (s) => s.getAll());
    return `wrote; sees ${seenList(markers.map((m: { label: string }) => m.label))}`;
  },

  // Keyed under the API's origin: Chrome's Cache API rejects chrome-extension:// URLs
  cacheApi: async ({ label, apiBase }, at) => {
    const cache = await caches.open(CACHE_NAME);
    const base = apiBase || globalThis.location.origin;
    await cache.put(new Request(`${base}/__probe/${encodeURIComponent(label)}`), new Response(at));
    const keys = await cache.keys();
    const labels = keys.map((k) => decodeURIComponent(new URL(k.url).pathname.slice(9)));
    return `wrote; sees ${seenList(labels)}`;
  },

  opfs: async ({ label }, at) => {
    const root = await navigator.storage.getDirectory();
    const file = await root.getFileHandle(`probe-${label.replace(/\W+/g, "_")}.txt`, {
      create: true,
    });
    const canWrite = "createWritable" in file;
    if (canWrite) {
      const writable = await file.createWritable();
      await writable.write(at);
      await writable.close();
    }
    const names: string[] = [];
    for await (const name of (root as unknown as { keys(): AsyncIterable<string> }).keys()) {
      if (name.startsWith("probe-")) names.push(name.slice(6, -4));
    }
    return `${canWrite ? "wrote" : "root reachable, createWritable missing"}; sees ${seenList(names)}`;
  },

  worker: async () => {
    if (typeof Worker === "undefined") throw new Error("no Worker constructor here");
    return "Worker constructor available";
  },

  webLocks: async () => {
    if (!navigator.locks) throw new Error("navigator.locks missing");
    return navigator.locks.request("ajot-probe", async () => "lock acquired and released");
  },

  fetchApi: async ({ apiBase, token }) => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${apiBase}/api/categories`, { headers, credentials: "include" });
    const auth = token ? "bearer + cookie" : "cookie only";
    if (!res.ok) throw new Error(`HTTP ${res.status} (${auth})`);
    const body = (await res.json()) as unknown[];
    return `HTTP ${res.status}, ${body.length} categories (${auth})`;
  },

  eventSource: async () => {
    if (typeof EventSource === "undefined") throw new Error("no EventSource here");
    return "EventSource available";
  },

  push: async () => {
    const registration =
      (g.registration as ServiceWorkerRegistration | undefined) ??
      (await navigator.serviceWorker?.getRegistration());
    if (!registration) throw new Error("no service worker registration");
    if (!registration.pushManager) throw new Error("no pushManager");
    const subscription = await registration.pushManager.getSubscription();
    let permission = "unknown";
    try {
      permission = await registration.pushManager.permissionState({ userVisibleOnly: true });
    } catch (err) {
      permission = `permissionState threw: ${(err as Error).message}`;
    }
    return `${subscription ? "subscribed" : "not subscribed"}; visible-push permission ${permission}`;
  },

  alarms: async () => {
    if (!ext?.alarms) throw new Error("no alarms API (not an extension, or permission missing)");
    return "alarms API available";
  },

  storagePersistence: async () => {
    const persisted = (await navigator.storage.persisted?.()) ?? false;
    const { usage = 0, quota = 0 } = (await navigator.storage.estimate?.()) ?? {};
    return `persisted ${persisted}; ${(usage / 1e6).toFixed(1)} MB of ${(quota / 1e6).toFixed(0)} MB`;
  },
};

export const runProbe = async (options: ProbeOptions): Promise<ProbeReport> => {
  const at = new Date().toISOString();
  const tag = `[probe:${options.label}]`;
  console.log(`${tag} start (${options.trigger}) in ${scopeName()}`);

  const results: Record<string, ProbeCheck> = {};
  for (const [name, check] of Object.entries(checks)) {
    try {
      results[name] = { ok: true, detail: await withTimeout(check(options, at)) };
    } catch (err) {
      results[name] = { ok: false, detail: err instanceof Error ? err.message : String(err) };
    }
    console.log(`${tag} ${results[name].ok ? "✓" : "✗"} ${name}: ${results[name].detail}`);
  }

  const report: ProbeReport = {
    label: options.label,
    trigger: options.trigger,
    at,
    scope: scopeName(),
    origin: globalThis.location?.origin ?? "unknown",
    manifestVersion: manifestVersion(),
    checks: results,
  };

  try {
    await inStore("reports", "readwrite", (s) => s.put(report));
  } catch (err) {
    console.warn(`${tag} couldn't save the report:`, err);
  }
  console.log(`${tag} done`, report);
  return report;
};

export const readReports = () =>
  inStore("reports", "readonly", (s) => s.getAll() as IDBRequest<ProbeReport[]>);

export const clearReports = async () => {
  await inStore("reports", "readwrite", (s) => s.clear());
  await inStore("markers", "readwrite", (s) => s.clear());
  await caches.delete(CACHE_NAME);
};

export const summarise = (report: ProbeReport) =>
  Object.entries(report.checks)
    .map(([name, check]) => `${check.ok ? "✓" : "✗"}${name}`)
    .join(" ");

export const vapidKeyBytes = (base64Url: string) => {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
};
