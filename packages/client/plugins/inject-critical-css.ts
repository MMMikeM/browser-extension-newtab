import { compile } from "@tailwindcss/node";
import { transform } from "lightningcss";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import type { PluginOption } from "vite";

export const injectCriticalCss = (): PluginOption => {
  const root = resolve(import.meta.dirname, "..");
  const outDir = join(root, "dist");
  const srcDir = join(root, "src");

  return {
    name: "inject-critical-css",
    apply: "build",
    async closeBundle() {
      if (this.environment?.name !== "client") return;

      const indexPath = join(outDir, "index.html");
      const html = readFileSync(indexPath, "utf-8");

      // Extract class candidates from prerendered HTML class attributes
      const candidates = [
        ...new Set(
          [...html.matchAll(/\bclass="([^"]+)"/g)].flatMap((m) =>
            m[1].split(/\s+/).filter(Boolean),
          ),
        ),
      ];

      // Strip font @imports from app.css before compilation — fontsource emits
      // @font-face with relative ./files/... URLs that only resolve from the CSS
      // file's location, not from an inline <style>. The full stylesheet (loaded
      // non-blocking) declares them with the correct hashed absolute paths.
      const appCss = readFileSync(join(srcDir, "app.css"), "utf-8")
        .replace(/source\("[^"]+"\)/, "source(none)")
        .replace(/@import "@fontsource[^;]+;\n?/g, "");

      // Compile with Tailwind's node API — resolves the same @import chains as the full build
      const compiler = await compile(appCss, { base: srcDir, onDependency: () => {} });

      // Use lightningcss to minify with proper CSS AST parsing (not regex)
      const { code } = transform({
        filename: "critical.css",
        code: Buffer.from(compiler.build(candidates)),
        minify: true,
      });
      const criticalCss = code.toString();

      // Find the hashed stylesheet link
      const cssLinkMatch = html.match(/<link rel="stylesheet"[^>]+href="([^"]+\.css)"[^>]*>/);
      if (!cssLinkMatch) throw new Error("inject-critical-css: <link rel=stylesheet> not found");
      const cssHref = cssLinkMatch[1];

      const updated = html
        // Convert full CSS to non-blocking preload; critical CSS covers the initial render
        .replace(
          cssLinkMatch[0],
          `<link rel="preload" href="${cssHref}" as="style" onload="this.rel='stylesheet'">` +
            `<noscript><link rel="stylesheet" href="${cssHref}"></noscript>`,
        )
        // Inject critical CSS before </head>
        .replace("</head>", `<style>${criticalCss}</style>\n</head>`);

      writeFileSync(indexPath, updated);
      console.log(`  Injected critical CSS (${Math.round(criticalCss.length / 1024)}KB)`);
    },
  };
};
