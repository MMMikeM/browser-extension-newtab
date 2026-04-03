import { defineConfig, loadEnv, type PluginOption } from "vite";
import devServer from "@hono/vite-dev-server";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { generateSW } from "./plugins/generate-sw";

/**
 * Serves the TanStackDB OPFS worker from node_modules in dev.
 * The library hardcodes `new Worker("/assets/opfs-worker-*.js")` —
 * Vite doesn't know about this path, so we intercept and serve it.
 */
const serveOpfsWorker = (): PluginOption => ({
  name: "serve-opfs-worker",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith("/assets/opfs-worker-")) {
        const file = resolve(
          import.meta.dirname,
          "node_modules/@tanstack/browser-db-sqlite-persistence/dist",
          req.url.slice(1), // strip leading /
        );
        try {
          res.setHeader("Content-Type", "application/javascript");
          res.end(readFileSync(file));
        } catch {
          next();
        }
        return;
      }
      next();
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(import.meta.dirname), "");
  const serverUrl = env.SERVER_URL || "http://localhost:3000";

  return {
    resolve: {
      alias: { "~": resolve(import.meta.dirname, "src") },
    },
    define: {
      "import.meta.env.SERVER_URL": JSON.stringify(serverUrl),
    },
    plugins: [
      serveOpfsWorker(),
      tailwindcss(),
      tanstackRouter({
        routesDirectory: "src/routes",
        generatedRouteTree: "src/routeTree.gen.ts",
      }),
      viteReact(),
      devServer({
        entry: "src/server/app.ts",
        exclude: [
          /^(?!\/api\/).+/,
        ],
        injectClientScript: false,
      }),
      generateSW(),
    ],
    build: {
      outDir: "dist/client",
    },
  };
});
