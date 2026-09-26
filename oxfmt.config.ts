import { defineConfig } from "oxfmt";

export default defineConfig({
  // Vendored Impeccable skill + subagents (managed by `npx impeccable update`)
  ignorePatterns: [
    "src/routeTree.gen.ts",
    ".claude/skills/impeccable/**",
    ".claude/agents/impeccable-*.md",
  ],
  sortTailwindcss: {
    stylesheet: "./packages/client/src/app.css",
    functions: ["cn", "cx", "tv"],
  },
});
