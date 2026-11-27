/**
 * Align core library: move runtime enums/interfaces, rewrite import paths.
 * Run after ConfigManager has been git-mv'd to apps/common/config.
 *
 *   node scripts/restructure/align-core-lib.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      walk(p, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function gitMv(fromRel, toRel) {
  const from = path.join(ROOT, fromRel);
  const to = path.join(ROOT, toRel);
  if (!fs.existsSync(from)) {
    console.warn('missing', fromRel);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (fs.existsSync(to)) {
    console.warn('exists', toRel);
    return;
  }
  try {
    execSync(`git mv "${from}" "${to}"`, { cwd: ROOT, stdio: 'pipe' });
  } catch {
    fs.renameSync(from, to);
  }
  console.log('mv', fromRel, '→', toRel);
}

function gitMvDir(fromRel, toRel) {
  const from = path.join(ROOT, fromRel);
  if (!fs.existsSync(from)) {
    console.warn('missing dir', fromRel);
    return;
  }
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const rel = path.join(fromRel, ent.name).replace(/\\/g, '/');
    const dest = path.join(toRel, ent.name).replace(/\\/g, '/');
    if (ent.isDirectory()) gitMvDir(rel, dest);
    else gitMv(rel, dest);
  }
}

// Engine enums to demote (keep GameEngineType, GameEngineEnv, MapNorthAxis, MapMode in core)
const ENGINE_ENUMS_KEEP = new Set([
  'GameEngineType.ts',
  'GameEngineEnv.ts',
  'MapNorthAxis.ts',
  'MapMode.ts',
  'index.ts',
]);

const engineEnumDir = path.join(SRC, 'core/enums/engine');
for (const name of fs.readdirSync(engineEnumDir)) {
  if (ENGINE_ENUMS_KEEP.has(name)) continue;
  if (name.endsWith('.ts')) {
    gitMv(`src/core/enums/engine/${name}`, `src/engine/enums/engine/${name}`);
  }
}

// Core interface/engine leftovers → engine
for (const name of ['IEngineFlags.ts', 'IEngineRenderContext.ts', 'IGameStateGroups.ts', 'index.ts']) {
  const from = `src/core/interface/engine/${name}`;
  if (fs.existsSync(path.join(ROOT, from))) {
    // merge into engine/interface/engine — index will be rewritten
    if (name === 'index.ts') continue;
    gitMv(from, `src/engine/interface/engine/${name}`);
  }
}

// loader ref + model loader options
if (fs.existsSync(path.join(SRC, 'core/interface/loaders/ITextureLoaderQueuedRef.ts'))) {
  gitMv(
    'src/core/interface/loaders/ITextureLoaderQueuedRef.ts',
    'src/engine/interface/loaders/ITextureLoaderQueuedRef.ts'
  );
}
if (fs.existsSync(path.join(SRC, 'core/interface/odyssey/IOdysseyModelLoaderOptions.ts'))) {
  gitMv(
    'src/core/interface/odyssey/IOdysseyModelLoaderOptions.ts',
    'src/engine/interface/odyssey/IOdysseyModelLoaderOptions.ts'
  );
}

// server enums → engine/enums/server
gitMvDir('src/core/enums/server', 'src/engine/enums/server');

// WindowDialog → apps/common
if (fs.existsSync(path.join(SRC, 'core/utility/WindowDialog.ts'))) {
  gitMv('src/core/utility/WindowDialog.ts', 'src/apps/common/config/WindowDialog.ts');
}

// --- rewrite import paths ---
const REPLACEMENTS = [
  [/@core\/managers\/ConfigManager/g, '@apps/common/config/ConfigManager'],
  [/@core\/utility\/WindowDialog/g, '@apps/common/config/WindowDialog'],
  [/@core\/interface\/loaders\/ITextureLoaderQueuedRef/g, '@engine/interface/loaders/ITextureLoaderQueuedRef'],
  [/@core\/interface\/odyssey\/IOdysseyModelLoaderOptions/g, '@engine/interface/odyssey/IOdysseyModelLoaderOptions'],
  [/@core\/interface\/engine\/IEngineFlags/g, '@engine/interface/engine/IEngineFlags'],
  [/@core\/interface\/engine\/IEngineRenderContext/g, '@engine/interface/engine/IEngineRenderContext'],
  [/@core\/interface\/engine\/IGameStateGroups/g, '@engine/interface/engine/IGameStateGroups'],
  [/@core\/enums\/server\//g, '@engine/enums/server/'],
  [/@core\/enums\/server"/g, '@engine/enums/server"'],
  [/@core\/enums\/server'/g, "@engine/enums/server'"],
];

// Runtime engine enums that moved
const movedEngineEnums = [
  'AutoPauseState', 'ClientCameraMode', 'EngineDebugType', 'EngineMode', 'EngineState',
  'FadeOverlayState', 'LightPriority', 'MiniGameType', 'PerceptionMask', 'PerceptionType',
  'RenderLayer', 'ReputationConstant', 'TutorialMessage', 'TalentObjectType',
  'FeedbackMessageColor', 'FeedbackOption', 'UIIconTimerType', 'ExperienceType',
  'TalkVolume', 'TextSprite3DType',
];
for (const e of movedEngineEnums) {
  REPLACEMENTS.push([
    new RegExp(`@core/enums/engine/${e}`, 'g'),
    `@engine/enums/engine/${e}`,
  ]);
  // bare barrel import { X } from "@core/enums/engine" still works for kept ones;
  // files that import moved ones via barrel need path updates — handled if they used deep paths.
}

let count = 0;
for (const file of walk(SRC)) {
  let s = fs.readFileSync(file, 'utf8');
  let next = s;
  for (const [re, to] of REPLACEMENTS) next = next.replace(re, to);
  // Fix broken GameRuntimeBootstrap path if present
  next = next.replace(/@\/utility\/ConfigClient/g, '@core/filesystem/ConfigClient');
  if (next !== s) {
    fs.writeFileSync(file, next);
    count++;
  }
}
console.log('rewrote', count, 'files');
