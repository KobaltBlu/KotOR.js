/**
 * Extract retail KotOR I/II save folders into readable GFF JSON under exports/.
 *
 * Layout:
 *   exports/<k1|k2>/save/<profile>/
 *     manifest.json
 *     schema-summary.json
 *     sidecar/<name>.json
 *     savegame/<resref>.<ext>.json
 *     savegame/modules/<module>/<category>/<resref>.<ext>.json
 *
 * Usage:
 *   npm run export-save-gff -- [options]
 *
 * Options:
 *   --k1-saves <path>     KotOR I Saves directory
 *   --k2-saves <path>     KotOR II Saves directory
 *   --out <path>          Output root (default: exports)
 *   --game <k1|k2|both>   Which game(s) (default: both)
 *   --profile <slug>      Profile name under save/ (repeatable with --source-folder)
 *   --source-folder <n>   Save slot folder name (e.g. "000000 - QUICKSAVE")
 *   --skip-existing       Skip files that already exist
 *   --skip-binary         Skip non-GFF binaries (default: on)
 *   -h, --help            Show help
 *
 * Defaults (when no --profile/--source-folder pairs given):
 *   k1 → profile quicksave from "000000 - QUICKSAVE"
 *   k2 → profile autosave from "000001 - AUTOSAVE"
 */

import * as fs from 'fs';
import * as path from 'path';
import { ERFObject } from '@core/resource/ERFObject';
import { ResourceTypes } from '@core/resource/ResourceTypes';
import { bufferToGffJson, bufferToGffObject } from './lib/gff-to-json';

type GameId = 'k1' | 'k2';

interface ProfileSpec {
  profile: string;
  sourceFolder: string;
}

interface CliOptions {
  k1Saves?: string;
  k2Saves?: string;
  out: string;
  game: 'k1' | 'k2' | 'both';
  profiles: ProfileSpec[];
  skipExisting: boolean;
  skipBinary: boolean;
  help: boolean;
}

interface ExportStats {
  total: number;
  written: number;
  skipped: number;
  failed: number;
  archivesOpened: number;
}

/** Human-readable subfolder under modules/<name>/ for each resource type. */
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
  [ResourceTypes.res]: 'res',
};

const GFF_EXTS = new Set([
  'gff', 'ifo', 'are', 'git', 'gic', 'utc', 'uti', 'utp', 'utd', 'ute',
  'uts', 'utm', 'utw', 'utt', 'dlg', 'jrl', 'fac', 'pth', 'res', 'bic',
  'gui', 'cut', 'ssf',
]);

const BINARY_SKIP_EXTS = new Set(['tga', 'tpc', 'dds', 'bmp', 'jpg', 'png', 'wav', 'mp3']);
const ERF_MAGICS = new Set(['ERF ', 'MOD ', 'SAV ', 'HAK ', 'NWM ']);
const GFF_VERSION = 'V3.2';

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_K1_SAVES = [
  process.env.KOTOR_SAVES,
  path.join(process.env.KOTOR_PATH || '', 'Saves'),
  'F:\\Games\\LucasArts\\Star Wars Knights of the Old Republic\\Saves',
].filter((p) => !!p && p !== path.sep && p !== 'Saves') as string[];

const DEFAULT_K2_SAVES = [
  process.env.TSL_SAVES,
  path.join(process.env.TSL_PATH || '', 'Saves'),
  'F:\\Games\\LucasArts\\Star Wars - KotOR2\\Saves',
].filter((p) => !!p && p !== path.sep && p !== 'Saves') as string[];

const DEFAULT_PROFILES: Record<GameId, ProfileSpec[]> = {
  k1: [{ profile: 'quicksave', sourceFolder: '000000 - QUICKSAVE' }],
  k2: [{ profile: 'autosave', sourceFolder: '000001 - AUTOSAVE' }],
};

function printHelp(): void {
  console.log(`Extract retail save folders into exports/<game>/save/<profile>/

Usage:
  npm run export-save-gff -- [options]

Options:
  --k1-saves <path>     KotOR I Saves directory
  --k2-saves <path>     KotOR II Saves directory
  --out <path>          Output root (default: exports)
  --game <k1|k2|both>   Which game(s) (default: both)
  --profile <slug>      Profile name (pair with --source-folder)
  --source-folder <n>   Save slot folder name
  --skip-existing       Skip files that already exist
  --no-skip-binary      Also attempt non-GFF binary sidecars (not recommended)
  -h, --help            Show help

Env:
  KOTOR_SAVES / TSL_SAVES   Default save directories
  KOTOR_PATH / TSL_PATH     Install roots (Saves/ appended)

Defaults:
  k1 → exports/k1/save/quicksave from "000000 - QUICKSAVE"
  k2 → exports/k2/save/autosave from "000001 - AUTOSAVE"
`);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    out: path.join(ROOT, 'exports'),
    game: 'both',
    profiles: [],
    skipExisting: false,
    skipBinary: true,
    help: false,
  };

  let pendingProfile: string | undefined;

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
      case '--k1-saves':
        opts.k1Saves = next();
        break;
      case '--k2-saves':
        opts.k2Saves = next();
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
      case '--profile':
        pendingProfile = next();
        break;
      case '--source-folder': {
        const folder = next();
        if (!pendingProfile) {
          throw new Error('--source-folder requires a preceding --profile');
        }
        opts.profiles.push({ profile: pendingProfile, sourceFolder: folder });
        pendingProfile = undefined;
        break;
      }
      case '--skip-existing':
        opts.skipExisting = true;
        break;
      case '--no-skip-binary':
        opts.skipBinary = false;
        break;
      case '--skip-binary':
        opts.skipBinary = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (pendingProfile) {
    throw new Error(`--profile '${pendingProfile}' missing --source-folder`);
  }

  return opts;
}

function emptyStats(): ExportStats {
  return { total: 0, written: 0, skipped: 0, failed: 0, archivesOpened: 0 };
}

function toU8(data: Buffer | Uint8Array): Uint8Array {
  return Uint8Array.from(data);
}

function readMagic4(buf: Uint8Array, offset = 0): string {
  if (buf.byteLength < offset + 4) return '';
  return String.fromCharCode(buf[offset], buf[offset + 1], buf[offset + 2], buf[offset + 3]);
}

function isErfBuffer(buf: Uint8Array): boolean {
  if (buf.byteLength < 8) return false;
  return ERF_MAGICS.has(readMagic4(buf, 0)) && readMagic4(buf, 4) === 'V1.0';
}

function isGffBuffer(buf: Uint8Array): boolean {
  if (buf.byteLength < 8) return false;
  const ver = readMagic4(buf, 4);
  return ver === GFF_VERSION || ver === 'V3.3';
}

function resTypeName(resType: number): string {
  const key = ResourceTypes.getKeyByValue?.(resType);
  return typeof key === 'string' ? key : String(resType);
}

function extractErfResource(erfBuffer: Uint8Array, offset: number, size: number): Uint8Array {
  if (!size || offset < 0 || offset + size > erfBuffer.byteLength) {
    return new Uint8Array(0);
  }
  return erfBuffer.slice(offset, offset + size);
}

async function loadErfFromBuffer(buf: Uint8Array): Promise<{ erf: ERFObject; buffer: Uint8Array }> {
  const buffer = toU8(buf);
  const erf = new ERFObject(buffer);
  await erf.load();
  return { erf, buffer };
}

function resolveSavesDir(explicit: string | undefined, candidates: string[], label: string): string | undefined {
  if (explicit) {
    const resolved = path.resolve(explicit);
    if (!fs.existsSync(resolved)) {
      throw new Error(`${label} saves directory missing: ${resolved}`);
    }
    return resolved;
  }
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  return undefined;
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

async function exportGffBuffer(
  buffer: Uint8Array,
  outPath: string,
  skipExisting: boolean,
  stats: ExportStats,
): Promise<void> {
  stats.total++;
  if (skipExisting && fs.existsSync(outPath)) {
    stats.skipped++;
    return;
  }
  try {
    const json = bufferToGffJson(buffer);
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
    await fs.promises.writeFile(outPath, json, 'utf8');
    stats.written++;
  } catch (e: any) {
    console.warn(`  [fail] ${path.basename(outPath)}: ${e?.message || e}`);
    stats.failed++;
  }
}

type SchemaField = {
  label: string;
  type: string;
  count: number;
  structIds: number[];
  childFields?: Record<string, SchemaField>;
};

type SchemaSummary = {
  resources: Array<{
    path: string;
    fileType: string;
    rootStructId: number;
    fields: Record<string, SchemaField>;
  }>;
};

function accumulateFieldSchema(
  into: Record<string, SchemaField>,
  label: string,
  type: string,
  structId?: number,
  childFields?: Record<string, SchemaField>,
): void {
  let entry = into[label];
  if (!entry) {
    entry = { label, type, count: 0, structIds: [] };
    into[label] = entry;
  }
  entry.count++;
  if (structId !== undefined && !entry.structIds.includes(structId)) {
    entry.structIds.push(structId);
  }
  if (childFields) {
    if (!entry.childFields) entry.childFields = {};
    for (const [k, v] of Object.entries(childFields)) {
      accumulateFieldSchema(entry.childFields, k, v.type, v.structIds[0], v.childFields);
      if (entry.childFields[k]) {
        entry.childFields[k].count += v.count - 1;
        for (const sid of v.structIds) {
          if (!entry.childFields[k].structIds.includes(sid)) {
            entry.childFields[k].structIds.push(sid);
          }
        }
      }
    }
  }
}

function schemaFromJsonNode(node: any): Record<string, SchemaField> {
  const fields: Record<string, SchemaField> = {};
  if (!node || typeof node !== 'object' || Array.isArray(node)) return fields;
  for (const [label, value] of Object.entries(node)) {
    if (label.startsWith('__')) continue;
    const field = value as any;
    if (!field || typeof field !== 'object' || typeof field.type !== 'string') continue;
    if (field.type === 'list' && Array.isArray(field.value)) {
      const childFields: Record<string, SchemaField> = {};
      for (const child of field.value) {
        const nested = schemaFromJsonNode(child);
        for (const [k, v] of Object.entries(nested)) {
          accumulateFieldSchema(childFields, k, v.type, v.structIds[0], v.childFields);
        }
        if (child && typeof child.__struct_id === 'number') {
          // track via a synthetic marker on list entry
          accumulateFieldSchema(childFields, '__struct_id', 'struct_id', child.__struct_id);
        }
      }
      accumulateFieldSchema(fields, label, field.type, undefined, childFields);
    } else if (field.type === 'struct' && field.value && typeof field.value === 'object') {
      const nested = schemaFromJsonNode(field.value);
      const sid = typeof field.value.__struct_id === 'number' ? field.value.__struct_id : undefined;
      accumulateFieldSchema(fields, label, field.type, sid, nested);
    } else {
      accumulateFieldSchema(fields, label, field.type);
    }
  }
  return fields;
}

async function exportSidecarGff(
  absPath: string,
  outPath: string,
  skipExisting: boolean,
  stats: ExportStats,
  schema: SchemaSummary,
  relativePath: string,
): Promise<void> {
  const buf = toU8(await fs.promises.readFile(absPath));
  if (!isGffBuffer(buf)) {
    return;
  }
  stats.total++;
  if (skipExisting && fs.existsSync(outPath)) {
    stats.skipped++;
    try {
      const existing = JSON.parse(await fs.promises.readFile(outPath, 'utf8'));
      schema.resources.push({
        path: relativePath,
        fileType: String(existing.__data_type || '').trim(),
        rootStructId: Number(existing.__struct_id ?? -1),
        fields: schemaFromJsonNode(existing),
      });
    } catch { /* ignore */ }
    return;
  }
  try {
    const gff = bufferToGffObject(buf);
    const json = gff.toJSONString(2);
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
    await fs.promises.writeFile(outPath, json, 'utf8');
    stats.written++;
    const parsed = JSON.parse(json);
    schema.resources.push({
      path: relativePath,
      fileType: (gff.FileType || '').replace(/\0/g, '').trim(),
      rootStructId: gff.RootNode?.type ?? -1,
      fields: schemaFromJsonNode(parsed),
    });
  } catch (e: any) {
    console.warn(`  [fail] ${path.basename(outPath)}: ${e?.message || e}`);
    stats.failed++;
  }
}

async function exportErfTree(
  erfBuffer: Uint8Array,
  outDir: string,
  relativeBase: string,
  skipExisting: boolean,
  skipBinary: boolean,
  stats: ExportStats,
  schema: SchemaSummary,
  isNestedModule = false,
): Promise<void> {
  const { erf, buffer } = await loadErfFromBuffer(erfBuffer);
  stats.archivesOpened++;

  for (let i = 0; i < erf.keyList.length; i++) {
    const key = erf.keyList[i];
    const res = erf.resources[key.resId];
    if (!res) continue;
    const data = extractErfResource(buffer, res.offset, res.size);
    const ext = resTypeName(key.resType).toLowerCase();
    const resref = String(key.resRef || '').toLowerCase().replace(/\0/g, '');

    // Nested module .sav archives
    if (ext === 'sav' && isErfBuffer(data)) {
      const moduleDir = path.join(outDir, 'modules', resref);
      await exportErfTree(
        data,
        moduleDir,
        `${relativeBase}/modules/${resref}`,
        skipExisting,
        skipBinary,
        stats,
        schema,
        true,
      );
      continue;
    }

    if (!isGffBuffer(data)) {
      if (skipBinary || BINARY_SKIP_EXTS.has(ext)) continue;
      continue;
    }

    let category = '';
    if (isNestedModule) {
      category = RESOURCE_FOLDERS[key.resType] || 'gff';
    }
    const fileName = `${resref}.${ext}.json`;
    const outPath = category
      ? path.join(outDir, category, fileName)
      : path.join(outDir, fileName);
    const relPath = category
      ? `${relativeBase}/${category}/${fileName}`
      : `${relativeBase}/${fileName}`;

    stats.total++;
    if (skipExisting && fs.existsSync(outPath)) {
      stats.skipped++;
      try {
        const existing = JSON.parse(await fs.promises.readFile(outPath, 'utf8'));
        schema.resources.push({
          path: relPath,
          fileType: String(existing.__data_type || '').trim(),
          rootStructId: Number(existing.__struct_id ?? -1),
          fields: schemaFromJsonNode(existing),
        });
      } catch { /* ignore */ }
      continue;
    }

    try {
      const gff = bufferToGffObject(data);
      const json = gff.toJSONString(2);
      await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
      await fs.promises.writeFile(outPath, json, 'utf8');
      stats.written++;
      const parsed = JSON.parse(json);
      schema.resources.push({
        path: relPath,
        fileType: (gff.FileType || '').replace(/\0/g, '').trim(),
        rootStructId: gff.RootNode?.type ?? -1,
        fields: schemaFromJsonNode(parsed),
      });
    } catch (e: any) {
      console.warn(`  [fail] ${fileName}: ${e?.message || e}`);
      stats.failed++;
    }
  }
}

function summarizeByFileType(schema: SchemaSummary): Record<string, { count: number; commonFields: string[] }> {
  const byType: Record<string, { count: number; fieldCounts: Map<string, number> }> = {};
  for (const res of schema.resources) {
    const ft = res.fileType || '????';
    if (!byType[ft]) byType[ft] = { count: 0, fieldCounts: new Map() };
    byType[ft].count++;
    for (const label of Object.keys(res.fields)) {
      byType[ft].fieldCounts.set(label, (byType[ft].fieldCounts.get(label) || 0) + 1);
    }
  }
  const out: Record<string, { count: number; commonFields: string[] }> = {};
  for (const [ft, info] of Object.entries(byType)) {
    const commonFields = [...info.fieldCounts.entries()]
      .filter(([, c]) => c >= Math.max(1, Math.floor(info.count * 0.5)))
      .map(([label]) => label)
      .sort((a, b) => a.localeCompare(b));
    out[ft] = { count: info.count, commonFields };
  }
  return out;
}

async function exportSaveProfile(
  game: GameId,
  savesDir: string,
  spec: ProfileSpec,
  outRoot: string,
  skipExisting: boolean,
  skipBinary: boolean,
): Promise<ExportStats> {
  const slotDir = path.join(savesDir, spec.sourceFolder);
  if (!fs.existsSync(slotDir)) {
    throw new Error(`Save slot missing: ${slotDir}`);
  }

  const profileOut = path.join(outRoot, game, 'save', spec.profile);
  console.log(`\n[${game}] ${spec.sourceFolder} → ${path.relative(ROOT, profileOut)}`);

  const stats = emptyStats();
  const schema: SchemaSummary = { resources: [] };
  const sidecarDir = path.join(profileOut, 'sidecar');
  const savegameDir = path.join(profileOut, 'savegame');

  const entries = await fs.promises.readdir(slotDir);
  let lastModule = '';
  let areaName = '';

  for (const name of entries) {
    const abs = path.join(slotDir, name);
    const st = await fs.promises.stat(abs);
    if (!st.isFile()) continue;
    const lower = name.toLowerCase();

    if (lower === 'savegame.sav') {
      const buf = toU8(await fs.promises.readFile(abs));
      if (!isErfBuffer(buf)) {
        console.warn(`  [warn] SAVEGAME.sav is not an ERF`);
        continue;
      }
      await exportErfTree(
        buf,
        savegameDir,
        'savegame',
        skipExisting,
        skipBinary,
        stats,
        schema,
        false,
      );
      continue;
    }

    if (BINARY_SKIP_EXTS.has(path.extname(lower).slice(1)) && skipBinary) {
      continue;
    }

    const buf = toU8(await fs.promises.readFile(abs));
    if (!isGffBuffer(buf)) continue;

    const outName = `${name.toLowerCase()}.json`;
    const outPath = path.join(sidecarDir, outName);
    await exportSidecarGff(abs, outPath, skipExisting, stats, schema, `sidecar/${outName}`);

    if (lower === 'savenfo.res') {
      try {
        const gff = bufferToGffObject(buf);
        if (gff.RootNode.hasField('LASTMODULE')) {
          lastModule = String(gff.RootNode.getFieldByLabel('LASTMODULE').getValue() || '');
        }
        if (gff.RootNode.hasField('AREANAME')) {
          areaName = String(gff.RootNode.getFieldByLabel('AREANAME').getValue() || '');
        }
      } catch { /* ignore */ }
    }
  }

  const byFileType = summarizeByFileType(schema);
  const manifest = {
    game,
    profile: spec.profile,
    sourceFolder: spec.sourceFolder,
    exportedAt: new Date().toISOString(),
    lastModule: lastModule || undefined,
    areaName: areaName || undefined,
    stats: {
      total: stats.total,
      written: stats.written,
      skipped: stats.skipped,
      failed: stats.failed,
      archivesOpened: stats.archivesOpened,
      resourcesCatalogued: schema.resources.length,
    },
    notes: [
      'Absolute install paths are intentionally omitted.',
      'Binary assets (screenshots/audio/textures) are skipped by default.',
      'Field labels, types, struct IDs, and list order are preserved from retail GFF.',
    ],
  };

  await writeTextFile(path.join(profileOut, 'manifest.json'), JSON.stringify(manifest, null, 2), false);
  await writeTextFile(
    path.join(profileOut, 'schema-summary.json'),
    JSON.stringify({ byFileType, resourceCount: schema.resources.length, resources: schema.resources }, null, 2),
    false,
  );

  console.log(
    `  done: written=${stats.written} skipped=${stats.skipped} failed=${stats.failed} archives=${stats.archivesOpened}`,
  );
  return stats;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const games: GameId[] =
    opts.game === 'both' ? ['k1', 'k2'] : [opts.game];

  for (const game of games) {
    const savesDir = resolveSavesDir(
      game === 'k1' ? opts.k1Saves : opts.k2Saves,
      game === 'k1' ? DEFAULT_K1_SAVES : DEFAULT_K2_SAVES,
      game.toUpperCase(),
    );
    if (!savesDir) {
      console.warn(`[${game}] No Saves directory found; skipping`);
      continue;
    }

    const profiles = opts.profiles.length ? opts.profiles : DEFAULT_PROFILES[game];
    for (const spec of profiles) {
      await exportSaveProfile(
        game,
        savesDir,
        spec,
        opts.out,
        opts.skipExisting,
        opts.skipBinary,
      );
    }
  }
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
