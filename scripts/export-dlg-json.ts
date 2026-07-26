/**
 * Extract module / BIF GFF assets and NCS scripts from KotOR I & II into `exports/`.
 *
 * Sources:
 *   - chitin.key / BIF (global dialogs → exports/<game>/dlg/)
 *   - modules/*.{rim,mod,erf} and rims/*.rim
 *       K1 templates/dialogs: *_s.rim (folded into base module folder)
 *       K2 dialogs: *_dlg.erf (folded into base module folder)
 *
 * Layout:
 *   exports/<k1|k2>/dlg/<resref>.dlg.json
 *       BIF / global dialogs only
 *   exports/<k1|k2>/module/<module>/<category>/<resref>.<ext>.json
 *       GFF templates (dialog, creatures, items, …)
 *   exports/<k1|k2>/module/<module>/scripts/<resref>.ncs
 *   exports/<k1|k2>/module/<module>/scripts/<resref>.ncs.asm
 *
 * Usage:
 *   npm run export-dlg-json -- [options]
 *
 * Options:
 *   --k1 <path>           KotOR I install directory (contains chitin.key)
 *   --k2 <path>           KotOR II (TSL) install directory
 *   --out <path>          Output root (default: exports)
 *   --game <k1|k2|both>   Which game(s) to export (default: both)
 *   --concurrency <n>     Parallel archive exports (default: 4)
 *   --skip-existing       Skip files that already exist on disk
 *   -h, --help            Show help
 *
 * Game directories can also be set via KOTOR_PATH / TSL_PATH env vars.
 */

import * as fs from 'fs';
import * as path from 'path';
import pLimit from 'p-limit';
import { ApplicationEnvironment } from '../src/enums/ApplicationEnvironment';
import { ApplicationProfile } from '../src/utility/ApplicationProfile';
import { KEYManager } from '../src/managers/KEYManager';
import { BIFManager } from '../src/managers/BIFManager';
import { ResourceTypes } from '../src/resource/ResourceTypes';
import { GFFObject } from '../src/resource/GFFObject';
import { RIMObject } from '../src/resource/RIMObject';
import { ERFObject } from '../src/resource/ERFObject';
import type { IKEYEntry } from '../src/interface/resource/IKEYEntry';
import { ncsBufferToAssembly } from './lib/ncs-to-assembly';

type GameId = 'k1' | 'k2';

interface CliOptions {
  k1?: string;
  k2?: string;
  out: string;
  game: 'k1' | 'k2' | 'both';
  concurrency: number;
  skipExisting: boolean;
  help: boolean;
}

interface ExportStats {
  total: number;
  written: number;
  skipped: number;
  failed: number;
}

/** Human-readable subfolder under module/<name>/ for each resource type. */
const RESOURCE_FOLDERS: Record<number, string> = {
  [ResourceTypes.dlg]: 'dialog',
  [ResourceTypes.utc]: 'creatures',
  [ResourceTypes.uti]: 'items',
  [ResourceTypes.utp]: 'placeables',
  [ResourceTypes.utd]: 'doors',
  [ResourceTypes.uts]: 'sounds',
  [ResourceTypes.ute]: 'encounters',
  [ResourceTypes.utt]: 'triggers',
  [ResourceTypes.utm]: 'merchants',
  [ResourceTypes.utw]: 'waypoints',
  [ResourceTypes.are]: 'area',
  [ResourceTypes.git]: 'git',
  [ResourceTypes.ifo]: 'module',
  [ResourceTypes.gic]: 'comments',
  [ResourceTypes.fac]: 'factions',
  [ResourceTypes.pth]: 'paths',
  [ResourceTypes.jrl]: 'journal',
  [ResourceTypes.gui]: 'gui',
  [ResourceTypes.cut]: 'cutscenes',
  [ResourceTypes.itp]: 'palettes',
  [ResourceTypes.gff]: 'gff',
  // Note: SSF soundsets are not GFF (binary V1.1) — skipped intentionally.
  [ResourceTypes.btc]: 'creatures',
  [ResourceTypes.bti]: 'items',
  [ResourceTypes.btp]: 'placeables',
  [ResourceTypes.btd]: 'doors',
  [ResourceTypes.bts]: 'sounds',
  [ResourceTypes.bte]: 'encounters',
  [ResourceTypes.btt]: 'triggers',
  [ResourceTypes.btm]: 'merchants',
  [ResourceTypes.btg]: 'generics',
  [ResourceTypes.utg]: 'generics',
  [ResourceTypes.ncs]: 'scripts',
};

const GFF_RES_TYPES = new Set(
  Object.keys(RESOURCE_FOLDERS)
    .map(Number)
    .filter((t) => t !== ResourceTypes.ncs),
);

const ROOT = path.resolve(__dirname, '..');
const ARCHIVE_EXTS = new Set(['.rim', '.mod', '.erf', '.hak']);

const DEFAULT_K1_PATHS = [
  process.env.KOTOR_PATH,
  'C:\\Games\\swkotor-steam',
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\swkotor',
  'C:\\Program Files (x86)\\GOG Galaxy\\Games\\Star Wars - Knights of the Old Republic',
  'C:\\GOG Games\\Star Wars - Knights of the Old Republic',
  'D:\\SteamLibrary\\steamapps\\common\\swkotor',
  'E:\\Games\\Steam\\steamapps\\common\\swkotor',
  'F:\\SteamLibrary\\steamapps\\common\\swkotor',
].filter(Boolean) as string[];

const DEFAULT_K2_PATHS = [
  process.env.TSL_PATH,
  'F:\\Games\\LucasArts\\Star Wars - KotOR2',
  'C:\\Games\\swkotor2-steam',
  'C:\\Games\\swkotor2',
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Knights of the Old Republic II',
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\swkotor2',
  'C:\\Program Files (x86)\\GOG Galaxy\\Games\\Star Wars Knights of the Old Republic II - The Sith Lords',
  'C:\\GOG Games\\Star Wars Knights of the Old Republic II - The Sith Lords',
  'D:\\SteamLibrary\\steamapps\\common\\Knights of the Old Republic II',
  'E:\\Games\\Steam\\steamapps\\common\\Knights of the Old Republic II',
  'F:\\SteamLibrary\\steamapps\\common\\Knights of the Old Republic II',
].filter(Boolean) as string[];

function printHelp(): void {
  console.log(`Extract module GFF assets + NCS/ASM (and BIF dialogs) into exports/

Usage:
  npm run export-dlg-json -- [options]

Options:
  --k1 <path>           KotOR I install directory (contains chitin.key)
  --k2 <path>           KotOR II (TSL) install directory
  --out <path>          Output root (default: exports)
  --game <k1|k2|both>   Which game(s) to export (default: both)
  --concurrency <n>     Parallel archive exports (default: 4)
  --skip-existing       Skip files that already exist on disk
  -h, --help            Show help

Env:
  KOTOR_PATH            Default KotOR I directory
  TSL_PATH              Default KotOR II directory
`);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    out: path.join(ROOT, 'exports'),
    game: 'both',
    concurrency: 4,
    skipExisting: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${arg}`);
      return v;
    };

    switch (arg) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '--k1':
        opts.k1 = next();
        break;
      case '--k2':
        opts.k2 = next();
        break;
      case '--out':
        opts.out = path.resolve(next());
        break;
      case '--game': {
        const g = next().toLowerCase();
        if (g !== 'k1' && g !== 'k2' && g !== 'both') {
          throw new Error(`Invalid --game '${g}' (expected k1|k2|both)`);
        }
        opts.game = g;
        break;
      }
      case '--concurrency': {
        const n = Number(next());
        if (!Number.isFinite(n) || n < 1) throw new Error('Invalid --concurrency');
        opts.concurrency = Math.floor(n);
        break;
      }
      case '--skip-existing':
        opts.skipExisting = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function hasChitinKey(dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, 'chitin.key'));
  } catch {
    return false;
  }
}

function resolveGameDir(explicit: string | undefined, candidates: string[], label: string): string | undefined {
  if (explicit) {
    const resolved = path.resolve(explicit);
    if (!hasChitinKey(resolved)) {
      throw new Error(`${label} directory missing chitin.key: ${resolved}`);
    }
    return resolved;
  }
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (hasChitinKey(resolved)) return resolved;
  }
  return undefined;
}

function resetResourceManagers(): void {
  BIFManager.bifs.clear();
  BIFManager.bifIndexes.clear();
  KEYManager.Key = undefined as any;
}

async function bindGameDirectory(gameDir: string): Promise<void> {
  ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
  ApplicationProfile.directory = gameDir;
  resetResourceManagers();
  await KEYManager.Load('chitin.key');
}

function resExt(resType: number): string {
  return (ResourceTypes.getKeyByValue(resType) as string) || String(resType);
}

/** Fold companion archives into the base module folder (`*_s`, `*_dlg`). */
function moduleFolderStem(archiveName: string): string {
  return path
    .parse(archiveName)
    .name.toLowerCase()
    .replace(/_s$/, '')
    .replace(/_dlg$/, '');
}

function mergeStats(into: ExportStats, from: ExportStats): void {
  into.total += from.total;
  into.written += from.written;
  into.skipped += from.skipped;
  into.failed += from.failed;
}

function emptyStats(): ExportStats {
  return { total: 0, written: 0, skipped: 0, failed: 0 };
}

async function writeTextFile(
  outPath: string,
  contents: string,
  skipExisting: boolean,
): Promise<'written' | 'skipped' | 'failed'> {
  if (skipExisting && fs.existsSync(outPath)) return 'skipped';
  try {
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
    await fs.promises.writeFile(outPath, contents, 'utf8');
    return 'written';
  } catch (e: any) {
    console.warn(`  [fail] ${outPath}: ${e?.message || e}`);
    return 'failed';
  }
}

async function writeBinaryFile(
  outPath: string,
  buffer: Uint8Array,
  skipExisting: boolean,
): Promise<'written' | 'skipped' | 'failed'> {
  if (skipExisting && fs.existsSync(outPath)) return 'skipped';
  if (!buffer?.length) return 'failed';
  try {
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
    await fs.promises.writeFile(outPath, buffer);
    return 'written';
  } catch (e: any) {
    console.warn(`  [fail] ${outPath}: ${e?.message || e}`);
    return 'failed';
  }
}

async function moveFilePreferKeep(from: string, to: string): Promise<boolean> {
  await fs.promises.mkdir(path.dirname(to), { recursive: true });
  if (fs.existsSync(to)) {
    await fs.promises.unlink(from);
    return false;
  }
  await fs.promises.rename(from, to);
  return true;
}

/**
 * Legacy cleanup:
 *   module/<name>/*.dlg.json → module/<name>/dialog/
 *   module/<name>_dlg/**     → module/<name>/…
 */
async function migrateLegacyModuleLayout(moduleOutDir: string): Promise<number> {
  if (!fs.existsSync(moduleOutDir)) return 0;
  let moved = 0;
  const modules = await fs.promises.readdir(moduleOutDir, { withFileTypes: true });

  for (const ent of modules) {
    if (!ent.isDirectory()) continue;
    const name = ent.name.toLowerCase();
    const modDir = path.join(moduleOutDir, ent.name);

    if (name.endsWith('_dlg')) {
      const base = name.replace(/_dlg$/, '');
      const baseDir = path.join(moduleOutDir, base);
      const entries = await fs.promises.readdir(modDir, { withFileTypes: true });
      for (const child of entries) {
        const from = path.join(modDir, child.name);
        if (child.isFile() && child.name.toLowerCase().endsWith('.dlg.json')) {
          if (await moveFilePreferKeep(from, path.join(baseDir, 'dialog', child.name))) moved++;
        } else if (child.isDirectory()) {
          const fromFiles = await fs.promises.readdir(from);
          for (const f of fromFiles) {
            const src = path.join(from, f);
            const st = await fs.promises.stat(src);
            if (!st.isFile()) continue;
            if (await moveFilePreferKeep(src, path.join(baseDir, child.name, f))) moved++;
          }
          try { await fs.promises.rmdir(from); } catch { /* non-empty */ }
        } else if (child.isFile()) {
          if (await moveFilePreferKeep(from, path.join(baseDir, 'dialog', child.name))) moved++;
        }
      }
      try { await fs.promises.rm(modDir, { recursive: true, force: true }); } catch { /* ignore */ }
      continue;
    }

    const files = await fs.promises.readdir(modDir);
    for (const file of files) {
      if (!file.toLowerCase().endsWith('.dlg.json')) continue;
      const from = path.join(modDir, file);
      const st = await fs.promises.stat(from);
      if (!st.isFile()) continue;
      if (await moveFilePreferKeep(from, path.join(modDir, 'dialog', file))) moved++;
    }
  }
  return moved;
}

function bufferToGffJson(buffer: Uint8Array): string {
  if (!buffer?.length || buffer.length < 14) {
    throw new Error('buffer too small for GFF');
  }
  // Avoid DataView bugs when the Uint8Array is a view into a larger ArrayBuffer.
  const copy =
    buffer.byteOffset === 0 && buffer.byteLength === buffer.buffer.byteLength
      ? buffer
      : buffer.slice();
  const version = String.fromCharCode(copy[4], copy[5], copy[6], copy[7]);
  if (version !== 'V3.2' && version !== 'V3.3') {
    throw new Error(`Not a GFF (got version '${version}')`);
  }

  // GFFObject.parse logs RangeErrors via console.error; silence during batch export.
  const prevError = console.error;
  console.error = () => {};
  try {
    const gff = new GFFObject(copy);
    const fileType = (gff.FileType || '').replace(/\0/g, '').trim();
    if (!fileType) {
      throw new Error('GFF parse failed (empty FileType)');
    }
    return gff.toJSONString(2);
  } finally {
    console.error = prevError;
  }
}

async function exportGffResource(
  buffer: Uint8Array,
  outPath: string,
  skipExisting: boolean,
): Promise<'written' | 'skipped' | 'failed'> {
  if (skipExisting && fs.existsSync(outPath)) return 'skipped';
  if (!buffer?.length) return 'failed';
  try {
    const json = bufferToGffJson(buffer);
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
    await fs.promises.writeFile(outPath, json, 'utf8');
    return 'written';
  } catch (e: any) {
    console.warn(`  [fail] ${path.basename(outPath)}: ${e?.message || e}`);
    return 'failed';
  }
}

async function exportNcsResource(
  buffer: Uint8Array,
  scriptsDir: string,
  resref: string,
  skipExisting: boolean,
  stats: ExportStats,
): Promise<void> {
  stats.total++;
  const ncsPath = path.join(scriptsDir, `${resref}.ncs`);
  const asmPath = path.join(scriptsDir, `${resref}.ncs.asm`);

  const ncsResult = await writeBinaryFile(ncsPath, buffer, skipExisting);
  if (ncsResult === 'failed') {
    stats.failed++;
    return;
  }

  let asmResult: 'written' | 'skipped' | 'failed' = 'skipped';
  try {
    const asm = ncsBufferToAssembly(buffer);
    asmResult = await writeTextFile(asmPath, asm, skipExisting);
  } catch (e: any) {
    console.warn(`  [fail] ${resref}.ncs.asm: ${e?.message || e}`);
    asmResult = 'failed';
  }

  if (ncsResult === 'written' || asmResult === 'written') stats.written++;
  else if (ncsResult === 'skipped' && asmResult === 'skipped') stats.skipped++;
  else stats.written++;
}

async function exportBifDlgs(outDir: string, concurrency: number, skipExisting: boolean): Promise<ExportStats> {
  const keys = KEYManager.Key.keys.filter((k: IKEYEntry) => k.resType === ResourceTypes.dlg);
  const stats = emptyStats();
  stats.total = keys.length;
  const limit = pLimit(concurrency);
  let done = 0;

  console.log(`  BIF: ${keys.length} DLG resources → ${outDir}`);

  await Promise.all(
    keys.map((key) =>
      limit(async () => {
        const resref = (key.resRef || '').trim().toLowerCase();
        if (!resref) {
          stats.failed++;
          return;
        }
        const outPath = path.join(outDir, `${resref}.dlg.json`);
        try {
          const buffer = await KEYManager.Key.getFileBuffer(key);
          const result = await exportGffResource(buffer, outPath, skipExisting);
          stats[result]++;
        } catch (e: any) {
          console.warn(`  [fail] bif/${resref}: ${e?.message || e}`);
          stats.failed++;
        }
        done++;
        if (done % 50 === 0 || done === keys.length) {
          process.stdout.write(`\r  BIF progress ${done}/${keys.length}`);
        }
      }),
    ),
  );
  if (keys.length) process.stdout.write('\n');
  return stats;
}

async function listArchiveFiles(gameDir: string): Promise<{ rel: string; stem: string }[]> {
  const found: { rel: string; stem: string }[] = [];
  for (const folder of ['modules', 'rims']) {
    const absFolder = path.join(gameDir, folder);
    if (!fs.existsSync(absFolder)) continue;
    const names = await fs.promises.readdir(absFolder);
    for (const name of names) {
      const ext = path.extname(name).toLowerCase();
      if (!ARCHIVE_EXTS.has(ext)) continue;
      const abs = path.join(absFolder, name);
      const st = await fs.promises.stat(abs);
      if (!st.isFile()) continue;
      found.push({
        rel: path.join(folder, name),
        stem: moduleFolderStem(name),
      });
    }
  }
  return found;
}

async function exportArchiveResource(
  resType: number,
  resRef: string,
  buffer: Uint8Array,
  moduleDir: string,
  skipExisting: boolean,
  stats: ExportStats,
): Promise<void> {
  const folder = RESOURCE_FOLDERS[resType];
  if (!folder) return;

  const resref = (resRef || '').trim().toLowerCase();
  if (!resref) {
    stats.failed++;
    return;
  }

  if (resType === ResourceTypes.ncs) {
    await exportNcsResource(buffer, path.join(moduleDir, folder), resref, skipExisting, stats);
    return;
  }

  if (!GFF_RES_TYPES.has(resType)) return;

  stats.total++;
  const ext = resExt(resType);
  const outPath = path.join(moduleDir, folder, `${resref}.${ext}.json`);
  const result = await exportGffResource(buffer, outPath, skipExisting);
  stats[result]++;
}

async function exportArchiveAssets(
  gameDir: string,
  moduleOutDir: string,
  concurrency: number,
  skipExisting: boolean,
): Promise<ExportStats> {
  const archives = await listArchiveFiles(gameDir);
  const stats = emptyStats();
  const limit = pLimit(Math.max(1, Math.min(concurrency, 2)));
  let archivesDone = 0;

  console.log(`  Archives: scanning ${archives.length} files under modules/ and rims/`);
  console.log(`  Module output: ${moduleOutDir}/<module>/{dialog,creatures,scripts,…}`);

  await Promise.all(
    archives.map((archive) =>
      limit(async () => {
        try {
          const moduleDir = path.join(moduleOutDir, archive.stem);
          const ext = path.extname(archive.rel).toLowerCase();

            if (ext === '.rim') {
              const rim = new RIMObject(archive.rel.replace(/\\/g, '/'));
              await rim.load();
              for (const res of rim.resources) {
                if (!RESOURCE_FOLDERS[res.resType]) continue;
                const buffer = await rim.getResourceBuffer(res);
                await exportArchiveResource(res.resType, res.resRef, buffer, moduleDir, skipExisting, stats);
                // Drop cached buffer so we don't retain the whole archive in RAM.
                (res as any).data = undefined;
              }
              rim.buffer = undefined as any;
              rim.reader = undefined as any;
            } else {
              const erf = new ERFObject(archive.rel.replace(/\\/g, '/'));
              await erf.load();
              for (const key of erf.keyList) {
                if (!RESOURCE_FOLDERS[key.resType]) continue;
                const buffer = await erf.getResourceBufferByResRef(key.resRef, key.resType);
                await exportArchiveResource(key.resType, key.resRef, buffer, moduleDir, skipExisting, stats);
              }
              for (const res of erf.resources) {
                (res as any).data = undefined;
              }
              await erf.dispose();
            }
        } catch (e: any) {
          console.warn(`  [fail] archive ${archive.rel}: ${e?.message || e}`);
        }
        archivesDone++;
        if (archivesDone % 10 === 0 || archivesDone === archives.length) {
          process.stdout.write(
            `\r  Archive progress ${archivesDone}/${archives.length} (res=${stats.total} written=${stats.written} failed=${stats.failed})`,
          );
        }
      }),
    ),
  );
  if (archives.length) process.stdout.write('\n');
  return stats;
}

async function exportGame(
  gameId: GameId,
  gameDir: string,
  outRoot: string,
  concurrency: number,
  skipExisting: boolean,
): Promise<ExportStats> {
  const dlgOutDir = path.join(outRoot, gameId, 'dlg');
  const moduleOutDir = path.join(outRoot, gameId, 'module');
  await fs.promises.mkdir(dlgOutDir, { recursive: true });
  await fs.promises.mkdir(moduleOutDir, { recursive: true });

  console.log(`\n=== ${gameId.toUpperCase()} ===`);
  console.log(`Install: ${gameDir}`);
  console.log(`BIF dlg: ${dlgOutDir}`);
  console.log(`Module:  ${moduleOutDir}/<module>/<category>/`);

  await bindGameDirectory(gameDir);

  const migrated = await migrateLegacyModuleLayout(moduleOutDir);
  if (migrated) console.log(`  Migrated ${migrated} legacy module dialog files`);

  const totals = emptyStats();
  mergeStats(totals, await exportBifDlgs(dlgOutDir, concurrency, skipExisting));
  mergeStats(totals, await exportArchiveAssets(gameDir, moduleOutDir, concurrency, skipExisting));

  console.log(
    `Done ${gameId}: written=${totals.written} skipped=${totals.skipped} failed=${totals.failed} total=${totals.total}`,
  );
  return totals;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const wantK1 = opts.game === 'k1' || opts.game === 'both';
  const wantK2 = opts.game === 'k2' || opts.game === 'both';

  const k1Dir = wantK1 ? resolveGameDir(opts.k1, DEFAULT_K1_PATHS, 'KotOR I') : undefined;
  const k2Dir = wantK2 ? resolveGameDir(opts.k2, DEFAULT_K2_PATHS, 'KotOR II') : undefined;

  if (wantK1 && !k1Dir) {
    throw new Error(
      'KotOR I install not found. Pass --k1 <path> or set KOTOR_PATH (directory must contain chitin.key).',
    );
  }
  if (wantK2 && !k2Dir) {
    if (opts.game === 'k2') {
      throw new Error(
        'KotOR II install not found. Pass --k2 <path> or set TSL_PATH (directory must contain chitin.key).',
      );
    }
    console.warn(
      'Warning: KotOR II install not found — skipping K2. Pass --k2 <path> or set TSL_PATH to include it.',
    );
  }

  await fs.promises.mkdir(opts.out, { recursive: true });

  const started = Date.now();
  if (k1Dir) await exportGame('k1', k1Dir, opts.out, opts.concurrency, opts.skipExisting);
  if (k2Dir) await exportGame('k2', k2Dir, opts.out, opts.concurrency, opts.skipExisting);

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nAll done in ${secs}s`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
