import { defineConfig } from "vite-plus";

// Lint and fmt apply to every package from here: package configs can't override them.
// The app build config is packages/client/vite.config.ts.
export default defineConfig({
  lint: {
    options: { typeAware: true, typeCheck: true },
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "import", "jsx-a11y"],
    categories: { correctness: "error" },
    // .claude/skills/impeccable is vendored (managed by `npx impeccable update`)
    ignorePatterns: ["src/routeTree.gen.ts", ".worktrees/**", ".claude/skills/impeccable/**"],
    rules: {
      // React Compiler manages dependency tracking — this rule is redundant and produces false positives
      "react-hooks/exhaustive-deps": ["off"],
      "@typescript-eslint/no-explicit-any": ["error"],
      "no-unused-vars": ["error"],
      "no-unsafe-optional-chaining": ["error"],
      // Collections are exported with `!` but are null in the SSR build target, where
      // useLiveQuery returns `data: undefined`. The `data = []` defaults are load-bearing.
      "typescript/no-useless-default-assignment": ["off"],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["useMemo", "useCallback", "memo"],
              message:
                "React Compiler handles memoization automatically. Remove manual useMemo/useCallback/memo.",
            },
          ],
        },
      ],
    },
    overrides: [
      {
        files: ["packages/client/src/routes/**", "packages/client/src/components/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              paths: [
                {
                  name: "~/lib/api",
                  message:
                    "Import from ~/lib/actions or ~/lib/db/hooks instead. Direct API calls belong in ~/lib/actions.ts.",
                },
              ],
            },
          ],
        },
      },
      {
        files: ["packages/server/src/routes/**", "packages/server/src/*.ts"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: ["../db/client", "./db/client"],
                  message:
                    "Do not import the db instance directly. Use a repo from packages/server/src/db/ instead.",
                },
              ],
            },
          ],
        },
      },
      // `[!u]*` leaves out components/ui, where field.tsx wraps the raw primitives
      {
        files: [
          "packages/client/src/routes/**",
          "packages/client/src/components/[!u]*/**",
          "packages/client/src/components/[!u]*.tsx",
        ],
        rules: {
          "no-restricted-imports": [
            "warn",
            {
              paths: [
                {
                  name: "~/components/ui/input",
                  message:
                    "Use Input from ~/components/ui/field (underline style). ui/input is the raw shadcn primitive — only ui/field.tsx should import it directly.",
                },
                {
                  name: "~/components/ui/textarea",
                  message:
                    "Use Textarea from ~/components/ui/field (underline style). ui/textarea is the raw shadcn primitive — only ui/field.tsx should import it directly.",
                },
              ],
            },
          ],
        },
      },
    ],
  },
  fmt: {
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
  },
});
