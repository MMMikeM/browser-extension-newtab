import { defineConfig, loadEnv, type PluginOption } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { generateSW } from "./plugins/generate-sw";

/**
 * Rewrites server function URLs in the client bundle to point at the remote
 * Fly.io server. Needed because the extension runs from `moz-extension://`
 * where there is no local server — without this, `/_serverFn/` calls would
 * resolve against the extension origin and fail.
 *
 * Only applies to production builds; in dev, Vite's dev server proxies
 * server functions on the same origin.
 */
function remoteServerFnBase(serverUrl: string): PluginOption {
  const base = JSON.stringify(`${serverUrl}/_serverFn/`);
  return {
    name: "remote-server-fn-base",
    config(_, { command }) {
      if (command !== "build") return;
      return {
        environments: {
          client: {
            define: {
              "process.env.TSS_SERVER_FN_BASE": base,
              "import.meta.env.TSS_SERVER_FN_BASE": base,
              "import.meta.env.SSE_URL": JSON.stringify(serverUrl),
            },
          },
        },
      };
    },
    enforce: "post",
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(import.meta.dirname), "");
  const serverUrl = env.SERVER_URL || "http://localhost:3000";

  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      devtools({ removeDevtoolsOnBuild: false }),
      tailwindcss(),
      tanstackStart({
        spa: { enabled: true, prerender: { outputPath: "/index.html" } },
        importProtection: {
          client: {
            files: ["**/*.server.*", "**/server/**"],
          },
        },
      }),
      viteReact(),
      generateSW(),
      nitro({
        serverDir: "./src/server",
        apiBaseURL: "/api",
        apiDir: "api",
      }),
      remoteServerFnBase(serverUrl),
    ],
  };
});
