/**
 * Extract all WOK / PWK / DWK walkmeshes from KotOR I & II as Odyssey WalkMesh ASCII
 * into the repo `exports/` folder.
 *
 * Layout:
 *   exports/<k1|k2>/wok/<resref>.wok.ascii
 *   exports/<k1|k2>/wok/<resref>.pwk.ascii
 *   exports/<k1|k2>/wok/<resref>.dwk.ascii
 *
 * Usage:
 *   npm run export-wok-ascii -- [options]
 *
 * Options:
 *   --k1 <path>           KotOR I install directory (contains chitin.key)
 *   --k2 <path>           KotOR II (TSL) install directory
 *   --out <path>          Output root (default: exports)
 *   --game <k1|k2|both>   Which game(s) to export (default: both)
 *   --concurrency <n>     Parallel exports (default: 8)
 *   --skip-existing       Skip files that already exist on disk
 *   -h, --help            Show help
 *
 * Game directories can also be set via KOTOR_PATH / TSL_PATH env vars.
 * If omitted, common Steam/GOG install locations are probed.
 */

import * as fs from 'fs';
import * as path from 'path';
import pLimit from 'p-limit';
import { ApplicationEnvironment } from '../src/enums/ApplicationEnvironment';
import { ApplicationProfile } from '../src/utility/ApplicationProfile';
import { KEYManager } from '../src/managers/KEYManager';
import { BIFManager } from '../src/managers/BIFManager';
import { ResourceTypes } from '../src/resource/ResourceTypes';
import { exportOdysseyWalkMeshAsciiFromBuffer } from '../src/odyssey/export/odysseyWalkMeshAscii';
import type { IKEYEntry } from '../src/interface/resource/IKEYEntry';

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

const ROOT = path.resolve(__dirname, '..');

const WALKMESH_TYPES: { resType: number; ext: string }[] = [
  { resType: ResourceTypes.wok, ext: 'wok' },
  { resType: ResourceTypes.pwk, ext: 'pwk' },
  { resType: ResourceTypes.dwk, ext: 'dwk' },
];

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
  console.log(`Extract all WOK/PWK/DWK files as ASCII from KotOR I & II into exports/

Usage:
  npm run export-wok-ascii -- [options]

Options:
  --k1 <path>           KotOR I install directory (contains chitin.key)
  --k2 <path>           KotOR II (TSL) install directory
  --out <path>          Output root (default: exports)
  --game <k1|k2|both>   Which game(s) to export (default: both)
  --concurrency <n>     Parallel exports (default: 8)
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
    concurrency: 8,
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

async function exportOneWalkmesh(
  key: IKEYEntry,
  ext: string,
  outDir: string,
  skipExisting: boolean,
): Promise<'written' | 'skipped' | 'failed'> {
  const resref = (key.resRef || '').trim().toLowerCase();
  if (!resref) return 'failed';

  const outPath = path.join(outDir, `${resref}.${ext}.ascii`);
  if (skipExisting && fs.existsSync(outPath)) {
    return 'skipped';
  }

  try {
    const buf = await KEYManager.Key.getFileBuffer(key);
    if (!buf?.length) {
      console.warn(`  [fail] ${resref}.${ext}: empty buffer`);
      return 'failed';
    }

    const ascii = exportOdysseyWalkMeshAsciiFromBuffer(buf, { name: resref, extension: ext });
    await fs.promises.writeFile(outPath, ascii, 'utf8');
    return 'written';
  } catch (e: any) {
    console.warn(`  [fail] ${resref}.${ext}: ${e?.message || e}`);
    return 'failed';
  }
}

async function exportGame(
  gameId: GameId,
  gameDir: string,
  outRoot: string,
  concurrency: number,
  skipExisting: boolean,
): Promise<ExportStats> {
  const outDir = path.join(outRoot, gameId, 'wok');
  await fs.promises.mkdir(outDir, { recursive: true });

  console.log(`\n=== ${gameId.toUpperCase()} ===`);
  console.log(`Install: ${gameDir}`);
  console.log(`Output:  ${outDir}`);

  await bindGameDirectory(gameDir);

  const keys: { key: IKEYEntry; ext: string }[] = [];
  for (const { resType, ext } of WALKMESH_TYPES) {
    const typed = KEYManager.Key.keys.filter((k) => k.resType === resType);
    console.log(`Found ${typed.length} ${ext.toUpperCase()} resources`);
    for (const key of typed) keys.push({ key, ext });
  }

  const stats: ExportStats = { total: keys.length, written: 0, skipped: 0, failed: 0 };
  const limit = pLimit(concurrency);
  let done = 0;

  await Promise.all(
    keys.map(({ key, ext }) =>
      limit(async () => {
        const result = await exportOneWalkmesh(key, ext, outDir, skipExisting);
        stats[result]++;
        done++;
        if (done % 50 === 0 || done === keys.length) {
          process.stdout.write(
            `\r  progress ${done}/${keys.length} (written=${stats.written} skipped=${stats.skipped} failed=${stats.failed})`,
          );
        }
      }),
    ),
  );

  process.stdout.write('\n');
  console.log(
    `Done ${gameId}: written=${stats.written} skipped=${stats.skipped} failed=${stats.failed} total=${stats.total}`,
  );
  return stats;
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
