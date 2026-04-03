import { defineConfig, loadEnv } from "vite";
import devServer from "@hono/vite-dev-server";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { generateSW } from "./plugins/generate-sw";

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
