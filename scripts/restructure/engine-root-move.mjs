/**
 * Move loose src/engine/*.ts files into domain folders and rewrite imports.
 *
 *   node scripts/restructure/engine-root-move.mjs
 *   node scripts/restructure/engine-root-move.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ENGINE = path.join(ROOT, 'src', 'engine');
const DRY = process.argv.includes('--dry-run');

/** basename (no .ts) → destination folder under src/engine */
const MOVES = {
  // runtime/
  GameState: 'runtime',
  GameStateEvents: 'runtime',
  GameLoop: 'runtime',
  updateLoopSchedule: 'runtime',
  GameRuntimeBootstrap: 'runtime',
  EngineModeController: 'runtime',
  EngineDebugController: 'runtime',
  EngineContext: 'runtime',
  ViewportController: 'runtime',
  AIScheduler: 'runtime',
  LoadingScreen: 'runtime',
  'post-load-reveal-fade': 'runtime',
  ModuleLoadCoordinator: 'runtime',
  INIConfig: 'runtime',
  EngineLocation: 'runtime',

  // save/
  SaveGame: 'save',
  CurrentGame: 'save',
  ModuleSaveTable: 'save',
  SaveLoadAudit: 'save',

  // world/
  Faction: 'world',
  Reputation: 'world',
  Planetary: 'world',
  ScriptVarTable: 'world',
  'tlk-tokens': 'world',
  JournalEntry: 'world',
  JournalCategory: 'world',
  JournalCategoryEntry: 'world',
  DialogMessageEntry: 'world',
  FeedbackMessageEntry: 'world',

  // items/
  BaseItem: 'items',
  ItemProperty: 'items',

  // render/
  OdysseyRenderPipeline: 'render',
  MotionBlurController: 'render',
  GameplayCapture: 'render',
  FollowerCamera: 'render',
  TextSprite3D: 'render',
  VideoEffect: 'render',
  'scene-hit-check': 'render',

  // movement/
  CollisionContext: 'movement',
  SurfaceMaterial: 'movement',
  TileColor: 'movement',
  'area-transition-bmp': 'movement',
  'jump-to-location': 'movement',
  TurnSpeeds: 'movement',
};

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function ensureDir(dir) {
  if (!DRY) fs.mkdirSync(dir, { recursive: true });
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
    ensureDir(path.dirname(toAbs));
    fs.renameSync(fromAbs, toAbs);
    console.warn(`  rename (untracked): ${toPosix(path.relative(ROOT, fromAbs))}`);
  }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      walk(p, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

// --- Phase A: moves ---
console.log(`Engine root moves${DRY ? ' (dry-run)' : ''}`);
for (const [base, folder] of Object.entries(MOVES)) {
  const from = path.join(ENGINE, `${base}.ts`);
  const to = path.join(ENGINE, folder, `${base}.ts`);
  gitMv(from, to);
}

// Delete deprecated CollisionManager stub
const collisionStub = path.join(ENGINE, 'CollisionManager.ts');
if (fs.existsSync(collisionStub)) {
  if (DRY) {
    console.log('  delete src/engine/CollisionManager.ts');
  } else {
    try {
      execSync(`git rm -f "${collisionStub}"`, { cwd: ROOT, stdio: 'pipe' });
    } catch {
      fs.unlinkSync(collisionStub);
    }
    console.log('  deleted CollisionManager.ts stub');
  }
}

// --- Phase B: rewrite imports ---
const SPEC_RE =
  /((?:import|export)(?:\s+type)?[\s\w{},*]*\s+from\s+|import\s*\(\s*|jest\.mock\()\s*(['"])([^'"]+)\2/g;

function rewriteSpecifier(spec) {
  // @engine/Foo or @engine/Foo.ts → @engine/folder/Foo
  if (spec.startsWith('@engine/')) {
    const rest = spec.slice('@engine/'.length);
    // Already nested? leave alone unless it's a bare moved name
    const bare = rest.replace(/\.(ts|tsx)$/, '');
    if (bare.includes('/')) {
      // CollisionManager → CollisionContext
      if (bare === 'CollisionManager' || bare.endsWith('/CollisionManager')) {
        return '@engine/movement/CollisionContext';
      }
      return spec;
    }
    if (bare === 'CollisionManager') {
      return '@engine/movement/CollisionContext';
    }
    const folder = MOVES[bare];
    if (folder) {
      return `@engine/${folder}/${bare}`;
    }
    return spec;
  }

  // Legacy @/engine/Foo
  if (spec.startsWith('@/engine/')) {
    const rest = spec.slice('@/engine/'.length).replace(/\.(ts|tsx)$/, '');
    if (!rest.includes('/')) {
      if (rest === 'CollisionManager') return '@engine/movement/CollisionContext';
      const folder = MOVES[rest];
      if (folder) return `@engine/${folder}/${rest}`;
    }
    return spec.replace(/^@\//, '@').replace(/^@engine\//, '@engine/');
  }

  return spec;
}

function rewriteFile(absPath) {
  const original = fs.readFileSync(absPath, 'utf8');
  let changed = false;
  const next = original.replace(SPEC_RE, (full, prefix, quote, spec) => {
    // Relative imports from within engine that point at sibling root files
    let newSpec = spec;
    if (spec.startsWith('.')) {
      const resolved = path.resolve(path.dirname(absPath), spec);
      const relToEngine = toPosix(path.relative(ENGINE, resolved)).replace(/\.(ts|tsx)$/, '');
      if (!relToEngine.startsWith('..') && !relToEngine.includes('/')) {
        if (relToEngine === 'CollisionManager') {
          newSpec = '@engine/movement/CollisionContext';
        } else if (MOVES[relToEngine]) {
          newSpec = `@engine/${MOVES[relToEngine]}/${relToEngine}`;
        }
      } else if (!relToEngine.startsWith('..')) {
        // ../GameState etc. from a subfolder
        const parts = relToEngine.split('/');
        if (parts.length === 1 && MOVES[parts[0]]) {
          newSpec = `@engine/${MOVES[parts[0]]}/${parts[0]}`;
        } else if (parts.length === 1 && parts[0] === 'CollisionManager') {
          newSpec = '@engine/movement/CollisionContext';
        }
      }
    } else {
      newSpec = rewriteSpecifier(spec);
    }
    if (newSpec !== spec) {
      changed = true;
      return `${prefix}${quote}${newSpec}${quote}`;
    }
    return full;
  });

  // Only rewrite import path + binding when importing/mocking the deleted CollisionManager module.
  let next2 = next.replace(
    /(import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]@engine\/movement\/CollisionContext['"])/g,
    (stmt) => stmt.replace(/\bCollisionManager\b/g, 'CollisionContext')
  );
  next2 = next2.replace(
    /(jest\.mock\(\s*['"]@engine\/movement\/CollisionContext['"]\s*,\s*\(\s*\)\s*=>\s*\(\s*\{)([^}]*)(\}\s*\))/g,
    (_m, a, body, c) => a + body.replace(/\bCollisionManager\b/g, 'CollisionContext') + c
  );
  if (next2 !== next) changed = true;

  if (changed && !DRY) {
    fs.writeFileSync(absPath, next2, 'utf8');
  }
  return changed;
}

let rewriteCount = 0;
const roots = [path.join(ROOT, 'src'), path.join(ROOT, 'scripts')];
for (const root of roots) {
  for (const abs of walk(root)) {
    if (abs.includes(`${path.sep}scripts${path.sep}restructure${path.sep}`)) continue;
    if (rewriteFile(abs)) {
      rewriteCount++;
      if (DRY) console.log(`  rewrite: ${toPosix(path.relative(ROOT, abs))}`);
    }
  }
}

console.log(`Rewrote imports in ${rewriteCount} files`);
console.log(DRY ? 'Dry run complete.' : 'Engine root move complete.');
