#!/usr/bin/env node
"use strict";

/**
 * KotOR.js CLI – run npm scripts from package root.
 * Enables: npx kotor-js <script> and npx github:user/KotOR.js <script>
 */

const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

function findPackageRoot(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (dir !== root) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

function main() {
  const packageRoot = findPackageRoot(__dirname);
  if (!packageRoot) {
    console.error("kotor-js: could not find package root (no package.json).");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const isHelp = args.length === 0 || args[0] === "--help" || args[0] === "-h";

  if (isHelp) {
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    } catch {
      console.error("kotor-js: could not read package.json.");
      process.exit(1);
    }
    const scripts = pkg.scripts || {};
    const names = Object.keys(scripts).sort();
    console.log("Usage: npx kotor-js <script> [-- <script-args>]");
    console.log("       npx -y -p <pkg> kotor-js <script>   (from GitHub: use -p and explicit command)");
    console.log("");
    console.log("Scripts:");
    for (const name of names) {
      console.log("  " + name);
    }
    console.log("");
    console.log("Examples (from npm, if published):");
    console.log("  npx -y kotor-js start:electron");
    console.log("  npx -y kotor-js test -- --watch");
    console.log("");
    console.log("Examples (from GitHub; -p is required, first run can take several minutes):");
    console.log("  npx -y -p git+https://github.com/KobaltBlu/KotOR.js.git kotor-js start:electron");
    console.log("  npx -y -p github:KobaltBlu/KotOR.js kotor-js start:electron");
    return;
  }

  const scriptName = args[0];
  const extraArgs = args.slice(1);
  const npmArgs = ["run", scriptName];
  if (extraArgs.length > 0) npmArgs.push("--", ...extraArgs);

  const result = spawnSync("npm", npmArgs, {
    cwd: packageRoot,
    stdio: "inherit",
    shell: true,
  });

  process.exit(result.status ?? result.signal ? 128 + result.signal : 0);
}

main();
