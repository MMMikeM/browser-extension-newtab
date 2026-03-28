import { defineConfig, type PluginOption } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

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
            },
          },
        },
      };
    },
    enforce: "post",
  };
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      prerender: process.env.NO_PRERENDER
        ? undefined
        : {
            enabled: true,
            crawlLinks: false,
          },
      importProtection: {
        client: {
          files: ["**/*.server.*", "**/server/**"],
        },
      },
    }),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    nitro({
      serverDir: "./src/server",
      apiBaseURL: "/api",
      apiDir: "api",
      openAPI: { ui: { scalar: {} } },
    }),
    remoteServerFnBase(SERVER_URL),
  ],
});
