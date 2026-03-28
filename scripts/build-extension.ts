/**
 * Post-build script: assembles the extension from vite build output.
 *
 * Solves two MV2 CSP compliance issues:
 * 1. Extracts inline <script> tags from HTML to external .js files
 * 2. Patches the TSR hydration manifest so script assets use `src` instead of
 *    inline `children` (prevents CSP-blocked dynamic script creation at runtime)
 */

import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CLIENT_DIR = join(ROOT, ".output", "public");
const EXT_SRC = join(ROOT, "manifests");
const EXT_OUT = join(ROOT, ".output", "extension");

// Clean and create output
rmSync(EXT_OUT, { recursive: true, force: true });
mkdirSync(EXT_OUT, { recursive: true });

// Copy client build output
cpSync(CLIENT_DIR, EXT_OUT, { recursive: true });

// Copy extension manifest
cpSync(join(EXT_SRC, "extension.json"), join(EXT_OUT, "manifest.json"));

// Strip PWA files from extension output (SW only registers in browser context)
rmSync(join(EXT_OUT, "sw.js"), { force: true });
rmSync(join(EXT_OUT, "manifest.webmanifest"), { force: true });

// Extract inline scripts from index.html
let html = readFileSync(join(EXT_OUT, "index.html"), "utf-8");

let scriptIndex = 0;
const inlineScriptRegex = /<script([^>]*)>([^<]+)<\/script>/g;

html = html.replace(inlineScriptRegex, (match, attrs: string, content: string) => {
  if (attrs.includes("src=")) return match;
  if (!content.trim()) return match;

  // Patch TSR manifest: convert inline script children to src attributes.
  //
  // Before: {tag:"script",attrs:$R[7]={type:"module",async:!0},children:"import(\"/assets/foo.js\")"}
  // After:  {tag:"script",attrs:$R[7]={type:"module",async:!0,src:"/assets/foo.js"}}
  //
  // This makes the Asset component's useEffect take the `attrs.src` code path
  // (creates external <script src="...">) instead of the `children` path
  // (creates inline <script>textContent=...</script> which CSP blocks).
  const patchedContent = content.replace(
    /,async:(!0|true)\},children:"import\(\\"([^"]+)\\"\)"\}/g,
    (_m, asyncVal, importPath) => `,async:${asyncVal},src:"${importPath}"}}`,
  );

  if (patchedContent !== content) {
    console.log(`  Patched TSR manifest: converted inline import() to src attribute`);
  }

  const filename = `_inline-${scriptIndex++}.js`;
  writeFileSync(join(EXT_OUT, filename), patchedContent);

  const typeMatch = attrs.match(/type="([^"]*)"/);
  const typeAttr = typeMatch ? ` type="${typeMatch[1]}"` : "";
  const asyncAttr = attrs.includes("async") ? " async" : "";

  return `<script${typeAttr}${asyncAttr} src="/${filename}"></script>`;
});

writeFileSync(join(EXT_OUT, "index.html"), html);

console.log(`Extension built to ${EXT_OUT}`);
console.log(`Extracted ${scriptIndex} inline script(s)`);
