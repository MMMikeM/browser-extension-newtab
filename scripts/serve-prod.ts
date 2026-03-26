/**
 * Production server: wraps the Start handler in a Node HTTP server.
 * Serves both the server functions and static client assets.
 */

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = parseInt(process.env.PORT || "3000", 10);
const CLIENT_DIR = join(import.meta.dirname, "..", "dist", "client");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

// Import the production Start handler
const app = await import("../dist/server/server.js");
const handler = app.default;

const server = createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);

  // CORS for extension requests
  const origin = req.headers.origin || "";
  if (origin.startsWith("moz-extension://") || origin.startsWith("chrome-extension://")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization, content-type, x-tsr-serverFn, accept",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Expose-Headers", "x-tss-serialized, x-tss-raw");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
  }

  // Try static files from client build first (for assets)
  const filePath = join(CLIENT_DIR, url.pathname);
  if (!url.pathname.startsWith("/_serverFn") && existsSync(filePath)) {
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    try {
      const content = readFileSync(filePath);
      res.writeHead(200, { "Content-Type": mime });
      res.end(content);
      return;
    } catch {}
  }

  // Pass to Start handler for server functions and SSR
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const request = new Request(url.href, {
      method: req.method,
      headers,
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? await new Promise<Buffer>((resolve) => {
              const chunks: Buffer[] = [];
              req.on("data", (c) => chunks.push(c));
              req.on("end", () => resolve(Buffer.concat(chunks)));
            })
          : undefined,
    });

    const response = await handler.fetch(request);

    // Copy response headers
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });
    // Ensure CORS headers persist on the response
    if (origin.startsWith("moz-extension://") || origin.startsWith("chrome-extension://")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.writeHead(response.status);

    if (response.body) {
      const reader = (response.body as ReadableStream).getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      pump().catch((err) => {
        console.error("Stream error:", err);
        res.end();
      });
    } else {
      res.end(await response.text());
    }
  } catch (err) {
    console.error("Handler error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
});

server.listen(PORT, () => {
  console.log(`Production server running at http://localhost:${PORT}`);
  console.log(`Serving client assets from ${CLIENT_DIR}`);
  console.log(`Server functions at http://localhost:${PORT}/_serverFn/`);
});
