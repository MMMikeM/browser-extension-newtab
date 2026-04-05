import { defineConfig, loadEnv, searchForWorkspaceRoot, type PluginOption } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { readFileSync, cpSync, readdirSync, mkdirSync } from "node:fs";
import { generateSW } from "./plugins/generate-sw";
import { injectFontPreloads } from "./plugins/inject-font-preloads";
import { prerender } from "./plugins/prerender";
import { injectCriticalCss } from "./plugins/inject-critical-css";
import babel from "@rolldown/plugin-babel";
import { visualizer } from "rollup-plugin-visualizer";
import { globSync } from "node:fs";

const OPFS_WORKER_SRC = resolve(
  import.meta.dirname,
  "node_modules/@tanstack/browser-db-sqlite-persistence/dist/assets",
);

const WA_SQLITE_WASM =
  globSync(
    resolve(
      import.meta.dirname,
      "node_modules/.pnpm/@journeyapps+wa-sqlite*/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.wasm",
    ),
  )[0] ??
  globSync(
    resolve(
      import.meta.dirname,
      "../../node_modules/.pnpm/@journeyapps+wa-sqlite*/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.wasm",
    ),
  )[0]!;

/**
 * Handles the TanStackDB OPFS worker that the library loads via
 * `new Worker("/assets/opfs-worker-*.js")`.
 *
 * - Dev: serves the file from node_modules via middleware.
 * - Build: copies the worker into dist/assets/ at closeBundle.
 */
const opfsWorker = (): PluginOption => ({
  name: "opfs-worker",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith("/assets/opfs-worker-")) {
        try {
          res.setHeader("Content-Type", "application/javascript");
          res.end(readFileSync(resolve(OPFS_WORKER_SRC, req.url.split("/").pop()!)));
        } catch {
          next();
        }
        return;
      }
      if (req.url === "/assets/wa-sqlite.wasm") {
        try {
          res.setHeader("Content-Type", "application/wasm");
          res.end(readFileSync(WA_SQLITE_WASM));
        } catch {
          next();
        }
        return;
      }
      next();
    });
  },
  closeBundle() {
    if (this.environment?.name !== "client") return;

    const outDir = resolve(import.meta.dirname, "dist/assets");
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
  const env = loadEnv(mode, searchForWorkspaceRoot(process.cwd()), "");

  const serverUrl = env.SERVER_URL || "http://localhost:3000";

  return {
    server: {
      cors: { origin: true },
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd())],
      },
      proxy: {
        "/api": serverUrl,
      },
      warmup: {
        clientFiles: ["./src/main.tsx", "./src/routes/**/*.tsx"],
      },
    },
    resolve: {
      tsconfigPaths: true,
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
      viteReact({}),
      generateSW(),
      injectFontPreloads(),
      prerender(),
      injectCriticalCss(),
      babel({
        presets: [reactCompilerPreset()],
      }),
      visualizer(),
    ],
    build: {
      outDir: "dist",
      minify: false, // TEMP: non-minified deploy to verify hydration fix

      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              // 1. React Core (Priority: Highest)
              {
                name: "react-core",
                test: /node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/,
                priority: 50,
              },

              // 2. Local-First Database & Storage (Priority: High)
              {
                name: "tanstack-db",
                test: /node_modules[\\/](@tanstack[\\/](db|db-ivm|offline-transactions|browser-db-sqlite-persistence|query-db-collection)|@journeyapps|fractional-indexing|bignumber\.js|@noble)[\\/]/,
                priority: 40,
              },

              // 3. TanStack Routing & Data Fetching
              {
                name: "tanstack-core",
                test: /node_modules[\\/]@tanstack[\\/](react-router|router-core|history|react-query|query-core|react-form|form-core)[\\/]/,
                priority: 35,
              },

              // 4. UI Primitives & Styling
              {
                name: "ui-primitives",
                test: /node_modules[\\/](@base-ui|@floating-ui|tailwind-merge|tailwind-variants)[\\/]/,
                priority: 30,
              },

              // 5. Drag and Drop Engine
              {
                name: "dnd-kit",
                test: /node_modules[\\/]@dnd-kit[\\/]/,
                priority: 25,
              },

              // 6. Catch-all Vendor
              {
                name: "vendor",
                test: /node_modules[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  };
});
