import type { Page, Request } from "@playwright/test";

export type SyncTracker = {
  /**
   * Waits until all in-flight mutating API requests have completed.
   * Throws if the wait exceeds `timeout` ms.
   */
  waitForSync: (timeout?: number) => Promise<void>;
  /**
   * Throws if any tracked request got a 4xx/5xx or a network error. The syncTracker
   * fixture calls it in teardown.
   */
  assertNoFailures: () => void;
};

/** Only non-GET `/api/*` requests count, so the SSE stream never holds waitForSync open. */
export const createSyncTracker = (page: Page): SyncTracker => {
  const inflight = new Set<Request>();
  const failures: { url: string; status: number }[] = [];

  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/") && req.method() !== "GET") {
      inflight.add(req);
    }
  });

  page.on("requestfinished", async (req) => {
    if (!inflight.has(req)) return;
    inflight.delete(req);
    const res = await req.response();
    if (res && res.status() >= 400) {
      failures.push({ url: req.url(), status: res.status() });
    }
  });

  page.on("requestfailed", (req) => {
    if (!inflight.has(req)) return;
    inflight.delete(req);
    failures.push({ url: req.url(), status: 0 });
  });

  return {
    waitForSync: async (timeout = 5000) => {
      // Yield one tick so the browser has a chance to fire the request event
      // before we start polling the inflight set.
      await new Promise<void>((r) => setTimeout(r, 50));

      const deadline = Date.now() + timeout;
      while (inflight.size > 0) {
        if (Date.now() > deadline) {
          const pending = [...inflight].map((r) => r.url()).join(", ");
          throw new Error(`waitForSync timed out after ${timeout} ms. Still pending: ${pending}`);
        }
        await new Promise<void>((r) => setTimeout(r, 50));
      }
    },

    assertNoFailures: () => {
      if (failures.length === 0) return;
      const lines = failures
        .map((f) => `  ${f.status === 0 ? "network error" : f.status}  ${f.url}`)
        .join("\n");
      throw new Error(`API requests failed during test:\n${lines}`);
    },
  };
};
