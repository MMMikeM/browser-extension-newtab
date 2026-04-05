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
});
