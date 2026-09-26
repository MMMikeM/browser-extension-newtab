import type { KnipConfig } from "knip";

export default {
  ignore: ["packages/e2e/**", "packages/client/src/lib/gradients.ts"],
  workspaces: {
    "packages/client": {
      entry: [
        "src/main.tsx",
        "src/background.ts",
        "src/entry-server.tsx",
        "src/sw.ts",
        "src/routes/**/*.tsx",
      ],
      project: ["src/**/*.{ts,tsx}"],
      // Type-checking runs through Vite+ (tsgolint), so `typescript` is no longer a
      // dependency and knip won't auto-enable this plugin to read compilerOptions.types
      typescript: { config: ["tsconfig.json"] },
    },
    "packages/server": {
      project: ["src/**/*.{ts,tsx}"],
    },
    "packages/shared": {
      project: ["src/**/*.{ts,tsx}"],
    },
  },
  vite: false,
  vitest: false,
  ignoreExportsUsedInFile: true,
  ignoreDependencies: [
    // CSS @import — knip doesn't detect these as dependency usage
    "tw-animate-css",
    "@fontsource-variable/figtree",
    "@fontsource-variable/inter",
    "@fontsource/dm-serif-display",
    "shadcn",
    // Vite plugins / build tools — used in config files, not detectable as normal imports
    "@tanstack/router-plugin",
    "@tailwindcss/vite",
    "@tailwindcss/node", // peer dep of @tailwindcss/vite, invoked internally
    "lightningcss", // Vite CSS pipeline peer dep, version-pinned here
    "@vitejs/plugin-react",
    "@rolldown/plugin-babel",
    "babel-plugin-react-compiler",
    "workbox-build",
    "idb-keyval",
    "rollup-plugin-visualizer",
  ],
} satisfies KnipConfig;
