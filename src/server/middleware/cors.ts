import { defineMiddleware } from "h3";

/**
 * CORS middleware for browser extension origins.
 *
 * moz-extension:// and chrome-extension:// origins are cross-origin to the
 * Fly.io server, so every request needs CORS headers. The origin varies per
 * install (Firefox generates a unique UUID), so we echo it back dynamically.
 *
 * Access-Control-Expose-Headers is critical — without it, the browser hides
 * x-tss-serialized from JS and all server functions return undefined.
 */
export default defineMiddleware((event) => {
  const origin = event.req.headers.get("origin") ?? "";

  if (!origin.startsWith("moz-extension://") && !origin.startsWith("chrome-extension://")) {
    return;
  }

  event.res.headers.set("Access-Control-Allow-Origin", origin);
  event.res.headers.set(
    "Access-Control-Allow-Headers",
    "authorization, content-type, x-tsr-serverFn, accept",
  );
  event.res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  event.res.headers.set("Access-Control-Expose-Headers", "x-tss-serialized, x-tss-raw");

  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
});
