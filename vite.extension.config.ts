/**
 * Extension build: bundles background.ts + assembles dist/extension/.
 *
 * Runs after the main build so dist/client/ has all client assets.
 *
 * SERVER_URL controls the remote server for background SSE + task sync.
 *
 * Usage: vite build && vite build -c vite.extension.config.ts
 */
import { defineConfig, loadEnv } from "vite";
import { readFileSync, writeFileSync, cpSync, rmSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname);
const OUTPUT_PUBLIC = join(ROOT, "dist", "client");
const EXT_OUT = join(ROOT, "dist", "extension");

const buildExtensionManifest = (serverUrl: string) => ({
  manifest_version: 2,
  name: "New Tab Todo",
  version: "1.0.0",
  browser_specific_settings: {
    gecko: { id: "newtab-todo@local" },
  },
  chrome_url_overrides: {
    newtab: "index.html",
  },
  content_security_policy: `script-src 'self' 'unsafe-eval'; object-src 'self'; connect-src 'self' https: ${serverUrl.startsWith("http:") ? serverUrl : ""}`.trim(),
  permissions: ["storage"],
  background: {
    scripts: ["background.js"],
    persistent: true,
  },
});

const assembleExtension = (serverUrl: string) => {
  console.log(`  SERVER_URL: ${serverUrl}`);

  cpSync(OUTPUT_PUBLIC, EXT_OUT, { recursive: true });
  console.log(`  Copied ${OUTPUT_PUBLIC} → ${EXT_OUT}`);

  const manifest = buildExtensionManifest(serverUrl);
  writeFileSync(join(EXT_OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`  CSP: ${manifest.content_security_policy}`);

  // Strip PWA files
  rmSync(join(EXT_OUT, "sw.js"), { force: true });
  rmSync(join(EXT_OUT, "manifest.webmanifest"), { force: true });

  // Extract inline scripts for CSP compliance
  let html = readFileSync(join(EXT_OUT, "index.html"), "utf-8");
  let scriptIndex = 0;
  const inlineScriptRegex = /<script([^>]*)>([\s\S]+?)<\/script>/g;

  html = html.replace(inlineScriptRegex, (match, attrs: string, content: string) => {
    if (attrs.includes("src=")) return match;
    if (!content.trim()) return match;

    const filename = `_inline-${scriptIndex++}.js`;
    writeFileSync(join(EXT_OUT, filename), content);

    const typeMatch = attrs.match(/type="([^"]*)"/);
    const typeAttr = typeMatch ? ` type="${typeMatch[1]}"` : "";
    const asyncAttr = attrs.includes("async") ? " async" : "";

    return `<script${typeAttr}${asyncAttr} src="/${filename}"></script>`;
  });

  writeFileSync(join(EXT_OUT, "index.html"), html);
  console.log(`  Inline scripts extracted: ${scriptIndex}`);

  // Inline WASM in the OPFS worker. Firefox extension Web Workers can't
  // fetch() cross-origin or moz-extension:// resources. Embedding the WASM
  // bytes directly skips the fetch — Emscripten checks `wasmBinary` first.
  const wasmPath = join(OUTPUT_PUBLIC, "assets", "wa-sqlite.wasm");
  const wasmBase64 = readFileSync(wasmPath).toString("base64");
  for (const f of readdirSync(join(EXT_OUT, "assets"))) {
    if (!f.startsWith("opfs-worker-") || !f.endsWith(".js")) continue;
    const path = join(EXT_OUT, "assets", f);
    const src = readFileSync(path, "utf-8");
    const wasmBytes = `Uint8Array.from(atob("${wasmBase64}"),c=>c.charCodeAt(0)).buffer`;
    const patched = src.replace("var wasmBinary;", `var wasmBinary = ${wasmBytes};`);
    if (patched === src) throw new Error("Failed to patch wasmBinary in OPFS worker");
    writeFileSync(path, patched);
    console.log(`  Inlined WASM in OPFS worker (${(wasmBase64.length / 1024).toFixed(0)} KB base64)`);
  }

  console.log(`  Output: ${EXT_OUT}`);
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ROOT, "");
  const serverUrl = env.SERVER_URL || "http://localhost:3000";

  return {
    resolve: {
      alias: { "~": join(ROOT, "src") },
    },
    define: {
      __SERVER_URL__: JSON.stringify(serverUrl),
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
      lib: {
        entry: join(ROOT, "src", "background.ts"),
        formats: ["iife"],
        name: "background",
        fileName: () => "background.js",
      },
      outDir: EXT_OUT,
      emptyOutDir: true,
      minify: false,
      rollupOptions: { output: { entryFileNames: "background.js" } },
    },
    logLevel: "warn",
    plugins: [
      {
        name: "assemble-extension",
        closeBundle() {
          assembleExtension(serverUrl);
        },
      },
    ],
  };
});
