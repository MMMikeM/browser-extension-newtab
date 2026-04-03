import { defineConfig, loadEnv, type PluginOption } from "vite";
import devServer from "@hono/vite-dev-server";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { readFileSync, cpSync, readdirSync, mkdirSync } from "node:fs";
import { generateSW } from "./plugins/generate-sw";

const OPFS_WORKER_SRC = resolve(
  import.meta.dirname,
  "node_modules/@tanstack/browser-db-sqlite-persistence/dist/assets",
);

import { globSync } from "node:fs";
const WA_SQLITE_WASM = globSync(
  resolve(import.meta.dirname, "node_modules/.pnpm/@journeyapps+wa-sqlite*/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.wasm"),
)[0]!;

/**
 * Handles the TanStackDB OPFS worker that the library loads via
 * `new Worker("/assets/opfs-worker-*.js")`.
 *
 * - Dev: serves the file from node_modules via middleware.
 * - Build: copies the worker into dist/client/assets/ at closeBundle.
 */
const opfsWorker = (): PluginOption => ({
  name: "opfs-worker",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith("/assets/opfs-worker-")) {
        try {
          res.setHeader("Content-Type", "application/javascript");
          res.end(readFileSync(resolve(OPFS_WORKER_SRC, req.url.split("/").pop()!)));
        } catch { next(); }
        return;
      }
      if (req.url === "/assets/wa-sqlite.wasm") {
        try {
          res.setHeader("Content-Type", "application/wasm");
          res.end(readFileSync(WA_SQLITE_WASM));
        } catch { next(); }
        return;
      }
      next();
    });
  },
  closeBundle() {
    if (this.environment?.name !== "client") return;

    const outDir = resolve(import.meta.dirname, "dist/client/assets");
    mkdirSync(outDir, { recursive: true });

    for (const f of readdirSync(OPFS_WORKER_SRC)) {
      if (f.startsWith("opfs-worker-") && f.endsWith(".js")) {
        cpSync(resolve(OPFS_WORKER_SRC, f), resolve(outDir, f));
      }
    }
    cpSync(WA_SQLITE_WASM, resolve(outDir, "wa-sqlite.wasm"));
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(import.meta.dirname), "");
  const serverUrl = env.SERVER_URL || "http://localhost:3000";

  return {
    server: {
      cors: { origin: true },
    },
    resolve: {
      alias: { "~": resolve(import.meta.dirname, "src") },
    },
    define: {
      "import.meta.env.SERVER_URL": JSON.stringify(serverUrl),
    },
    plugins: [
      opfsWorker(),
      tailwindcss(),
      tanstackRouter({
        routesDirectory: "src/routes",
        generatedRouteTree: "src/routeTree.gen.ts",
      }),
      viteReact(),
      devServer({
        entry: "src/server/app.ts",
        exclude: [/^(?!\/api\/).+/],
        injectClientScript: false,
      }),
      generateSW(),
    ],
    build: {
      outDir: "dist/client",
    },
  };
});
