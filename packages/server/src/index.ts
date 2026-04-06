import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "./app";

// Prevent silent crashes from async errors (e.g. libsql background sync
// firing on a just-restored network after Fly suspend/resume).
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

const clientDist =
  process.env.CLIENT_DIST_PATH || resolve(import.meta.dirname, "../../client/dist");

// Serve hashed assets with long-term immutable cache (Vite content-hashes filenames)
app.use("/assets/*", async (c, next) => {
  await next();
  if (c.res.status === 200) {
    c.res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
});

// Serve static assets from the Vite build output
app.use("*", serveStatic({ root: clientDist }));

// SPA fallback — serve index.html for all non-API routes
app.get("*", serveStatic({ root: clientDist, path: "index.html" }));

const port = Number(process.env.PORT || 3000);
console.log(`Server listening on http://0.0.0.0:${port}`);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
