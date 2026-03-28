import type { KnipConfig } from "knip";

export default {
  entry: [
    "src/routes/**/*.tsx",
    "src/router.tsx",
    "src/sw.ts",
    "src/server/middleware/**/*.ts",
    "src/server/api/**/*.ts",
    "scripts/*.ts",
  ],
  project: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
  ignoreExportsUsedInFile: true,
  ignore: ["src/components/ui/**", "src/server/db/columns.ts"],
  ignoreDependencies: [
    "tw-animate-css",
    "@fontsource-variable/figtree",
    "@fontsource-variable/inter",
    "shadcn",
    "@tanstack/router-plugin",
  ],
} satisfies KnipConfig;
