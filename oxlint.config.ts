import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "import", "jsx-a11y"],
  ignorePatterns: ["src/routeTree.gen.ts"],
});
