import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

function collectJavaScript(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectJavaScript(path));
    else if ([".js", ".mjs"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

for (const file of collectJavaScript(join(rootPath, "src"))) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || `Syntax check failed: ${file}`);
}

for (const target of Object.values(packageJson.exports)) {
  const exportPath = typeof target === "string" ? target : target.import;
  if (exportPath) assert.ok(existsSync(new URL(exportPath, root)), `Missing package export: ${exportPath}`);
  if (typeof target === "object" && target.types) {
    assert.ok(existsSync(new URL(target.types, root)), `Missing type export: ${target.types}`);
  }
}

const tests = spawnSync(process.execPath, ["--test", "test/model.test.js", "test/render.test.js", "test/tracking.test.js", "test/contract.test.js"], {
  cwd: rootPath,
  encoding: "utf8",
  stdio: "inherit"
});
assert.equal(tests.status, 0, "Test suite failed.");

console.log("Syntax, package exports, and tests passed.");
