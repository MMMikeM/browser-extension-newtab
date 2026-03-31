import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "import", "jsx-a11y"],
  ignorePatterns: ["src/routeTree.gen.ts"],
  rules: {
    "func-style": ["error", "expression"],
    "@typescript-eslint/no-explicit-any": ["error"],
  },
  overrides: [
    {
      files: ["**/*.tsx"],
      rules: {
        "func-style": ["error", "expression", { overrides: { namedExports: "declaration" } }],
      },
    },
  ],
});
