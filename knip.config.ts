import type { KnipConfig } from "knip";

export default {
  entry: [
    "src/main.tsx",
    "src/server/app.ts",
    "src/background.ts",
    "src/sw.ts",
    "src/routes/**/*.tsx",
  ],
  project: ["src/**/*.{ts,tsx}"],
  vite: false,
  vitest: false,
  ignoreExportsUsedInFile: true,
  ignore: ["src/components/ui/**", "src/server/db/columns.ts"],
  ignoreDependencies: [
    "tw-animate-css",
    "@fontsource-variable/figtree",
    "@fontsource-variable/inter",
    "shadcn",
    "@tanstack/router-plugin",
    "@hono/vite-dev-server",
    "@hono/zod-openapi",
    "@tailwindcss/vite",
    "@vitejs/plugin-react",
    "@rolldown/plugin-babel",
    "babel-plugin-react-compiler",
    "workbox-build",
    "@tanstack/offline-transactions",
    "@tanstack/react-query-persist-client",
    "idb-keyval",
  ],
} satisfies KnipConfig;
