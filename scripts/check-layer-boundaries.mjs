/**
 * Enforces KotOR.js layer import rules:
 *   @core/*   → only @core/* and npm packages
 *   @engine/* → @core/* and @engine/* (never @apps/*)
 *   @apps/*   → @core/*, same-app @apps/<app>/*, and engine only via
 *               @apps/<app>/KotOR (value imports). `import type` from
 *               @engine/* is allowed.
 *
 * Usage:
 *   node scripts/check-layer-boundaries.mjs           # fail on violations
 *   node scripts/check-layer-boundaries.mjs --report   # print only, exit 0
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const REPORT_ONLY = process.argv.includes('--report');

const IMPORT_RE =
  /(?:import|export)(?:\s+type)?[\s\w{},*]*(?:\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** @returns {'core'|'engine'|'apps'|'root'|'other'|null} */
function layerOfFile(absPath) {
  const rel = path.relative(SRC, absPath).replace(/\\/g, '/');
  if (rel.startsWith('core/') || rel === 'core') return 'core';
  if (rel.startsWith('engine/') || rel === 'engine') return 'engine';
  if (rel.startsWith('apps/') || rel === 'apps') return 'apps';
  // Library entry and ambient types live at src root.
  if (!rel.includes('/')) return 'root';
  return 'other';
}

/** @returns {{ layer: string, spec: string } | null} */
function resolveSpecifier(spec, fromFile) {
  if (spec.startsWith('@core/')) {
    return { layer: 'core', spec };
  }
  if (spec.startsWith('@engine/')) {
    return { layer: 'engine', spec };
  }
  if (spec.startsWith('@apps/')) {
    return { layer: 'apps', spec };
  }
  if (spec.startsWith('@assets/')) {
    return { layer: 'assets', spec };
  }
  // Legacy @/ — treat as unresolved during migration (report as other).
  if (spec.startsWith('@/')) {
    const rest = spec.slice(2);
    if (rest.startsWith('core/')) return { layer: 'core', spec };
    if (rest.startsWith('engine/')) return { layer: 'engine', spec };
    if (rest.startsWith('apps/')) return { layer: 'apps', spec };
    return { layer: 'legacy', spec };
  }
  if (spec.startsWith('.')) {
    const resolved = path.resolve(path.dirname(fromFile), spec);
    // Try common extensions
    const candidates = [
      resolved,
      resolved + '.ts',
      resolved + '.tsx',
      path.join(resolved, 'index.ts'),
      path.join(resolved, 'index.tsx'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        const layer = layerOfFile(c);
        return { layer: layer ?? 'other', spec };
      }
    }
    // Directory may exist without us finding the file — classify by path.
    const rel = path.relative(SRC, resolved).replace(/\\/g, '/');
    if (rel.startsWith('core/')) return { layer: 'core', spec };
    if (rel.startsWith('engine/')) return { layer: 'engine', spec };
    if (rel.startsWith('apps/')) return { layer: 'apps', spec };
    return null;
  }
  // npm / node builtins
  return null;
}

function appNameFromPath(absPath) {
  const rel = path.relative(SRC, absPath).replace(/\\/g, '/');
  const m = rel.match(/^apps\/([^/]+)/);
  return m ? m[1] : null;
}

function isKotORShim(spec, fromApp) {
  if (!fromApp) return false;
  return (
    spec === `@apps/${fromApp}/KotOR` ||
    spec === `@/apps/${fromApp}/KotOR` ||
    spec.endsWith(`/apps/${fromApp}/KotOR`)
  );
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

function extractImports(source) {
  const results = [];
  let m;
  const re = new RegExp(IMPORT_RE.source, 'g');
  while ((m = re.exec(source))) {
    const spec = m[1] || m[2];
    if (!spec) continue;
    const stmt = m[0];
    const isTypeOnly =
      /^\s*import\s+type\b/.test(stmt) ||
      /^\s*export\s+type\b/.test(stmt);
    results.push({ spec, isTypeOnly, stmt: stmt.slice(0, 80) });
  }
  return results;
}

const violations = [];
const files = walk(SRC);

for (const file of files) {
  const fromLayer = layerOfFile(file);
  if (!fromLayer || fromLayer === 'other') continue;
  // Root entry may re-export core + engine.
  if (fromLayer === 'root') continue;

  const source = fs.readFileSync(file, 'utf8');
  const imports = extractImports(source);
  const fromApp = fromLayer === 'apps' ? appNameFromPath(file) : null;
  const relFile = path.relative(ROOT, file).replace(/\\/g, '/');

  for (const { spec, isTypeOnly } of imports) {
    // Core must not depend on three / WebGL (format parsers stay data-only).
    if (fromLayer === 'core') {
      const bare = spec.replace(/^three\/.*/, 'three');
      if (bare === 'three' || spec === 'three' || spec.startsWith('three/')) {
        violations.push({
          file: relFile,
          rule: 'core-no-three',
          message: `core must not import three: ${spec}`,
        });
      }
    }

    const resolved = resolveSpecifier(spec, file);
    if (!resolved) continue;
    const to = resolved.layer;

    if (fromLayer === 'core') {
      if (to === 'engine' || to === 'apps' || to === 'legacy') {
        violations.push({
          file: relFile,
          rule: 'core-isolation',
          message: `core must not import ${to}: ${spec}`,
        });
      }
    } else if (fromLayer === 'engine') {
      if (to === 'apps') {
        violations.push({
          file: relFile,
          rule: 'engine-no-apps',
          message: `engine must not import apps: ${spec}`,
        });
      }
      if (to === 'legacy') {
        violations.push({
          file: relFile,
          rule: 'no-legacy-alias',
          message: `engine still uses legacy @/ alias: ${spec}`,
        });
      }
    } else if (fromLayer === 'apps') {
      if (to === 'engine' && !isTypeOnly) {
        violations.push({
          file: relFile,
          rule: 'apps-engine-via-shim',
          message: `apps must not value-import engine (use KotOR shim or import type): ${spec}`,
        });
      }
      if (to === 'apps') {
        const targetApp = spec.match(/@apps\/([^/]+)/)?.[1]
          || spec.match(/@\/apps\/([^/]+)/)?.[1]
          || (() => {
            const rel = path.relative(SRC, path.resolve(path.dirname(file), spec)).replace(/\\/g, '/');
            return rel.match(/^apps\/([^/]+)/)?.[1];
          })();
        // Allow shared hosts: common UI and launcher profile/bootstrap context.
        const sharedApps = new Set(['common', 'launcher']);
        if (targetApp && fromApp && targetApp !== fromApp && !sharedApps.has(targetApp)) {
          if (!sharedApps.has(fromApp) || targetApp !== 'common') {
            violations.push({
              file: relFile,
              rule: 'apps-cross-app',
              message: `app '${fromApp}' must not import app '${targetApp}': ${spec}`,
            });
          }
        }
      }
      if (to === 'legacy') {
        // Engine-ish legacy paths that apps should go through shim for.
        const rest = spec.slice(2);
        const enginePrefixes = [
          'engine/', 'module/', 'managers/', 'GameState', 'LoadingScreen',
          'gui/', 'audio/', 'video/', 'three/', 'shaders/', 'loaders/',
          'actions/', 'effects/', 'events/', 'combat/', 'talents/', 'controls/',
          'odyssey/', 'game/', 'inspect/', 'server/', 'worker/',
        ];
        if (enginePrefixes.some((p) => rest === p.slice(0, -1) || rest.startsWith(p))) {
          if (!isTypeOnly && !isKotORShim(spec, fromApp)) {
            violations.push({
              file: relFile,
              rule: 'apps-legacy-engine',
              message: `apps must not value-import engine via @/: ${spec}`,
            });
          }
        }
      }
      // Value import of another app's KotOR from wrong path is fine if shim.
      if (to === 'apps' && isKotORShim(spec, fromApp)) {
        // ok
      }
    }
  }
}

// Deduplicate
const seen = new Set();
const unique = violations.filter((v) => {
  const k = `${v.file}|${v.message}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

if (unique.length === 0) {
  console.log('Layer boundary check: OK (0 violations)');
  process.exit(0);
}

console.log(`Layer boundary check: ${unique.length} violation(s)\n`);
for (const v of unique) {
  console.log(`  [${v.rule}] ${v.file}`);
  console.log(`    ${v.message}`);
}

if (REPORT_ONLY) {
  console.log('\n(--report mode: exiting 0)');
  process.exit(0);
}

process.exit(1);
