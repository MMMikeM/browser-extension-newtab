import type { KnipConfig } from "knip";

export default {
  entry: ["src/routes/**/*.tsx", "src/router.tsx", "server/middleware/**/*.ts", "scripts/*.ts"],
  project: ["src/**/*.{ts,tsx}", "server/**/*.ts", "scripts/**/*.ts"],
  ignoreExportsUsedInFile: true,
  ignore: ["src/components/ui/**", "src/server/columns.ts"],
  ignoreDependencies: [
    "tw-animate-css",
    "@fontsource-variable/figtree",
    "@fontsource-variable/inter",
    "shadcn",
    "@tanstack/router-plugin",
  ],
} satisfies KnipConfig;
