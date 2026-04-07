import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "import", "jsx-a11y"],
  categories: { correctness: "error" },
  ignorePatterns: ["src/routeTree.gen.ts"],
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
