import { defineConfig } from "vite-plus";

// Workspace-root Vite+ config: lint/fmt apply to every package (package configs
// cannot override them). App build config lives in packages/client/vite.config.ts.
export default defineConfig({
  lint: {
    options: { typeAware: true, typeCheck: true },
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "import", "jsx-a11y"],
    categories: { correctness: "error" },
    ignorePatterns: ["src/routeTree.gen.ts", ".worktrees/**"],
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
      // The Drizzle db instance should only be used inside repo files (packages/server/src/db/).
      // Routes and other server code must go through repos for all DB access.
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
      // Raw input primitives are shadcn baselines — app code should use the
      // app-styled Input/Textarea exported from ~/components/ui/field, which
      // applies the underline language and composes with Field/FormField.
      // Only ui/field.tsx should import these directly.
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
    ignorePatterns: ["src/routeTree.gen.ts"],
    sortTailwindcss: {
      stylesheet: "./packages/client/src/app.css",
      functions: ["cn", "cx", "tv"],
    },
  },
});
