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

      const prerenderedClasses = [
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

      // Tailwind's node API resolves the same @import chains as the full build
      const compiler = await compile(appCss, { base: srcDir, onDependency: () => {} });

      const { code } = transform({
        filename: "critical.css",
        code: Buffer.from(compiler.build(prerenderedClasses)),
        minify: true,
      });
      const criticalCss = code.toString();

      const cssLinkMatch = html.match(/<link rel="stylesheet"[^>]+href="([^"]+\.css)"[^>]*>/);
      if (!cssLinkMatch) throw new Error("inject-critical-css: <link rel=stylesheet> not found");
      const cssHref = cssLinkMatch[1];

      // The full sheet can load non-blocking because the critical CSS covers the first render.
      // The <style> goes first: equal-specificity ties go to the later rule, so the full
      // sheet must follow it (an inlined .flex would otherwise beat desk:hidden).
      const updated = html.replace(
        cssLinkMatch[0],
        `<style>${criticalCss}</style>` +
          `<link rel="preload" href="${cssHref}" as="style" onload="this.rel='stylesheet'">` +
          `<noscript><link rel="stylesheet" href="${cssHref}"></noscript>`,
      );

      writeFileSync(indexPath, updated);
      console.log(`  Injected critical CSS (${Math.round(criticalCss.length / 1024)}KB)`);
    },
  };
};
