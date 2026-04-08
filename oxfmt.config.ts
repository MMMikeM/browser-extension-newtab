import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: ["src/routeTree.gen.ts"],
  sortTailwindcss: {
    stylesheet: "./packages/client/src/app.css",
    functions: ["cn", "cx", "tv"],
  },
});
