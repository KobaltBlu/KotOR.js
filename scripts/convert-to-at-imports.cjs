/**
 * Converts relative imports (../ or ./) to @/ path alias in .ts and .tsx files.
 * Run from repo root: node scripts/convert-to-at-imports.cjs
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');
const extRoot = path.join(repoRoot, 'extensions', 'kotor-forge-vscode');

function* walk(dir, ext) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'out' || e.name === '.git') continue;
      yield* walk(full, ext);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
      yield full;
    }
  }
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function relativeToSrc(absolutePath) {
  const normalized = path.normalize(absolutePath);
  let rel = path.relative(srcRoot, normalized);
  if (rel.startsWith('..')) return null; // outside src
  rel = toPosix(rel);
  // Strip extension for import path
  rel = rel.replace(/\.(tsx?|jsx?)$/, '');
  return rel ? `@/${rel}` : null;
}

function relativeToRepoSrc(absolutePath) {
  const normalized = path.normalize(absolutePath);
  let rel = path.relative(repoRoot, normalized);
  if (!rel.startsWith('src' + path.sep) && rel !== 'src') return null;
  rel = toPosix(rel).replace(/^src\/?/, '');
  if (!rel) return '@/';
  rel = rel.replace(/\.(tsx?|jsx?)$/, '');
  return `@/${rel}`;
}

function convertFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  const isInSrc = filePath.startsWith(srcRoot + path.sep) || filePath === srcRoot;
  const isInExt = filePath.startsWith(extRoot + path.sep);

  let out = content;
  // Match: from "..." or from '...' or require("...") or require('...') with relative path
  // Match from "path" or from 'path' or require("path") with relative path (./ or ../)
  const importRegex = /(?:from\s+['"]|require\s*\(\s*['"])((?:\.\.?\/)[^'"]*)(['"])/g;
  let match;
  const replacements = [];
  while ((match = importRegex.exec(content)) !== null) {
    const rawPath = match[1];
    if (!rawPath.startsWith('./') && !rawPath.startsWith('../')) continue;
    const resolved = path.resolve(dir, rawPath);
    let alias;
    if (isInSrc) {
      alias = relativeToSrc(resolved);
    } else if (isInExt) {
      alias = relativeToRepoSrc(resolved);
    } else {
      alias = relativeToRepoSrc(resolved);
    }
    if (alias) {
      // Strip /index from alias so @/foo/index -> @/foo
      if (alias.endsWith('/index')) alias = alias.slice(0, -6);
      const fullMatch = match[0];
      const newImport = fullMatch.replace(match[1], alias);
      replacements.push({ from: fullMatch, to: newImport });
    }
  }
  for (const r of replacements) {
    out = out.split(r.from).join(r.to);
  }
  if (out !== content) {
    fs.writeFileSync(filePath, out, 'utf8');
    return true;
  }
  return false;
}

let count = 0;
for (const file of walk(srcRoot)) {
  if (convertFile(file)) count++;
}
for (const file of walk(extRoot)) {
  if (convertFile(file)) count++;
}
process.stdout.write(`Converted ${count} files.\n`);
