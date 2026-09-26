import { defineConfig } from "oxlint";

export default defineConfig({
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
});
