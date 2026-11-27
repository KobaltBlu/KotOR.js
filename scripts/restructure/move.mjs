/**
 * Mechanical restructure: git-mv files per mapping.mjs, then rewrite imports.
 *
 *   node scripts/restructure/move.mjs           # execute
 *   node scripts/restructure/move.mjs --dry-run # print plan only
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mapPath, rewriteImportPath, sortedPathMoves } from './mapping.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');
const DRY = process.argv.includes('--dry-run');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function ensureDir(dir) {
  if (DRY) return;
  fs.mkdirSync(dir, { recursive: true });
}

function gitMv(fromAbs, toAbs) {
  ensureDir(path.dirname(toAbs));
  if (DRY) {
    console.log(`  git mv ${toPosix(path.relative(ROOT, fromAbs))} → ${toPosix(path.relative(ROOT, toAbs))}`);
    return;
  }
  if (!fs.existsSync(fromAbs)) {
    console.warn(`  SKIP missing: ${fromAbs}`);
    return;
  }
  if (fs.existsSync(toAbs)) {
    console.warn(`  SKIP exists: ${toAbs}`);
    return;
  }
  try {
    execSync(`git mv "${fromAbs}" "${toAbs}"`, { cwd: ROOT, stdio: 'pipe' });
  } catch {
    // Untracked files: plain rename
    ensureDir(path.dirname(toAbs));
    fs.renameSync(fromAbs, toAbs);
    console.warn(`  rename (untracked): ${toPosix(path.relative(ROOT, fromAbs))}`);
  }
}

// ---------- Phase A: collect and execute moves ----------
const allFiles = walk(SRC);
const moves = [];

for (const abs of allFiles) {
  const rel = toPosix(path.relative(SRC, abs));
  // Don't remapping already-moved core/engine/apps trees except known relocates inside engine/apps
  if (
    (rel.startsWith('core/') || rel.startsWith('engine/') || rel.startsWith('apps/')) &&
    !rel.startsWith('engine/Debugger') &&
    !rel.startsWith('engine/GameDebuggerBridge') &&
    !rel.startsWith('apps/forge/ForgePreviewHost')
  ) {
    // Existing engine/* content stays; apps/* (except ForgePreviewHost) stays.
    // But wait — engine/ already has files; we only move Debugger/GameDebuggerBridge out of engine root into debug/
    // apps stay except ForgePreviewHost
    if (rel.startsWith('apps/') && !rel.startsWith('apps/forge/ForgePreviewHost')) continue;
    if (rel.startsWith('engine/') && !rel.startsWith('engine/Debugger') && !rel.startsWith('engine/GameDebuggerBridge')) continue;
    if (rel.startsWith('core/')) continue;
  }

  const mapped = mapPath(rel);
  if (!mapped || mapped === rel) continue;
  moves.push({ from: abs, to: path.join(SRC, mapped), rel, mapped });
}

console.log(`Planned moves: ${moves.length}${DRY ? ' (dry-run)' : ''}`);

// Sort so we move deeper paths first? Actually parents first can fail if we move a dir via files.
// Move longest source path first to avoid parent/child conflicts.
moves.sort((a, b) => b.rel.length - a.rel.length);

for (const m of moves) {
  gitMv(m.from, m.to);
}

// Clean empty directories left behind
function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) removeEmptyDirs(path.join(dir, ent.name));
  }
  if (dir === SRC) return;
  try {
    if (fs.readdirSync(dir).length === 0) {
      if (!DRY) fs.rmdirSync(dir);
    }
  } catch { /* ignore */ }
}
if (!DRY) removeEmptyDirs(SRC);

// ---------- Phase B: rewrite imports in src/ and scripts/ ----------
const SPEC_RE =
  /((?:import|export)(?:\s+type)?[\s\w{},*]*\s+from\s+|import\s*\(\s*)(['"])([^'"]+)\2/g;

function rewriteSpecifier(spec) {
  // @/old/path
  if (spec.startsWith('@/')) {
    const rest = spec.slice(2);
    // Already new?
    if (rest.startsWith('core/') || rest.startsWith('engine/') || rest.startsWith('apps/')) {
      // Convert @/core → @core etc.
      if (rest.startsWith('core/')) return '@core/' + rest.slice('core/'.length);
      if (rest.startsWith('engine/')) return '@engine/' + rest.slice('engine/'.length);
      if (rest.startsWith('apps/')) return '@apps/' + rest.slice('apps/'.length);
    }
    if (rest === 'KotOR' || rest.startsWith('KotOR.')) {
      return '@/' + rest; // keep library entry as @/KotOR for now; webpack entry
    }
    const rewritten = rewriteImportPath(rest);
    if (rewritten) {
      // Fix botched KotOR rewrite
      if (rewritten.includes('@engine/../KotOR')) return '@/KotOR';
      return rewritten;
    }
    return spec;
  }
  // Already @core/@engine/@apps — leave
  if (spec.startsWith('@core/') || spec.startsWith('@engine/') || spec.startsWith('@apps/') || spec.startsWith('@assets/')) {
    return spec;
  }
  return spec;
}

function rewriteFile(absPath) {
  const original = fs.readFileSync(absPath, 'utf8');
  let changed = false;
  const next = original.replace(SPEC_RE, (full, prefix, quote, spec) => {
    // Also rewrite relative imports that cross the old layout — convert to alias when possible
    let newSpec = spec;
    if (spec.startsWith('@/') || spec.startsWith('@core') || spec.startsWith('@engine') || spec.startsWith('@apps')) {
      newSpec = rewriteSpecifier(spec);
    } else if (spec.startsWith('.')) {
      // Resolve relative → src-relative → map → alias
      const resolved = path.resolve(path.dirname(absPath), spec);
      const relToSrc = toPosix(path.relative(SRC, resolved));
      if (!relToSrc.startsWith('..')) {
        // Strip extension for matching
        let key = relToSrc.replace(/\.(ts|tsx|js|jsx|mjs)$/, '');
        // Try mapPath on various forms
        const mapped = mapPath(relToSrc) || mapPath(key + '.ts') || mapPath(key);
        if (mapped) {
          const mappedKey = mapped.replace(/\.(ts|tsx)$/, '');
          // Prefer alias form
          if (mappedKey.startsWith('core/')) newSpec = '@core/' + mappedKey.slice('core/'.length);
          else if (mappedKey.startsWith('engine/')) newSpec = '@engine/' + mappedKey.slice('engine/'.length);
          else if (mappedKey.startsWith('apps/')) newSpec = '@apps/' + mappedKey.slice('apps/'.length);
        } else {
          // File may already be at new location; rewrite relative to stay valid
          // If both sides moved, relative might still work — leave it.
        }
      }
    }
    if (newSpec !== spec) {
      changed = true;
      return `${prefix}${quote}${newSpec}${quote}`;
    }
    return full;
  });

  // Second pass: bare string refs in jest mocks etc. jest.mock('@/...')
  const MOCK_RE = /(jest\.mock\(|require\(|import\()\s*(['"])([^'"]+)\2/g;
  const next2 = next.replace(MOCK_RE, (full, prefix, quote, spec) => {
    if (!spec.startsWith('@/')) return full;
    const newSpec = rewriteSpecifier(spec);
    if (newSpec !== spec) {
      changed = true;
      return `${prefix}${quote}${newSpec}${quote}`;
    }
    return full;
  });

  if (changed && !DRY) {
    fs.writeFileSync(absPath, next2, 'utf8');
  }
  return changed;
}

const rewriteRoots = [SRC, path.join(ROOT, 'scripts')];
let rewriteCount = 0;
for (const root of rewriteRoots) {
  for (const abs of walk(root)) {
    if (!/\.(ts|tsx|js|mjs|jsx)$/.test(abs)) continue;
    if (abs.includes('scripts/restructure/')) continue;
    if (rewriteFile(abs)) {
      rewriteCount++;
      if (DRY) console.log(`  rewrite: ${toPosix(path.relative(ROOT, abs))}`);
    }
  }
}

console.log(`Rewrote imports in ${rewriteCount} files`);
console.log(DRY ? 'Dry run complete.' : 'Move complete.');
