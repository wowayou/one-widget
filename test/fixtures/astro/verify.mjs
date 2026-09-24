import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("dist", import.meta.url));

assert.ok(existsSync(distDir), "dist/ is missing — run `astro build` first.");

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(path));
    else files.push(path);
  }
  return files;
}

const files = collectFiles(distDir);
const indexPath = join(distDir, "index.html");
assert.ok(existsSync(indexPath), "dist/index.html was not generated.");
const indexHtml = readFileSync(indexPath, "utf8");

// 1. Static markup with attribution data-* attributes is present without JS.
assert.match(indexHtml, /data-one-widget/, "root widget marker missing from static HTML");
assert.match(indexHtml, /data-event-name="support_click"/, "tracking event name not emitted");
assert.match(
  indexHtml,
  /data-one-item="source"[^>]*data-event-name="source_click"/,
  "per-item event name override not emitted"
);
assert.match(indexHtml, /data-one-item="afdian"/, "per-item attribution id missing");
assert.match(indexHtml, /data-platform="github"/, "inferred platform attribution missing");

// 2. Component CSS reaches the build, whether inlined in <head> or as an asset.
const cssSources = [indexHtml, ...files
  .filter((file) => extname(file) === ".css")
  .map((file) => readFileSync(file, "utf8"))];
assert.ok(
  cssSources.some((source) => source.includes(".one-widget")),
  "component CSS did not reach the built output"
);

// 3. The client tracking enhancement ships, whether inlined or bundled as an asset.
const scriptSources = [indexHtml, ...files
  .filter((file) => [".js", ".mjs"].includes(extname(file)))
  .map((file) => readFileSync(file, "utf8"))];
assert.ok(
  scriptSources.some((source) => source.includes("one-widget:click") || source.includes("data-one-widget")),
  "client tracking enhancement did not reach the built output"
);

console.log("Astro fixture output verified: static markup, CSS, and client tracking all present.");
