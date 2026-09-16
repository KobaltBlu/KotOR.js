/**
 * Compare two KotOR savegame folders (reference save vs KotOR.js).
 *
 * Recursively walks folders, expands nested ERF/SAV archives, and diffs GFF
 * resources field-by-field using the project's GFFObject / ERFObject parsers.
 *
 * Usage:
 *   npm run compare-saves -- <leftDir> <rightDir> [options]
 *
 * Options:
 *   --label-left <name>       Label for left side (default: left)
 *   --label-right <name>      Label for right side (default: right)
 *   --float-eps <n>           Float/double equality epsilon (default: 1e-4)
 *   --max-diffs <n>           Stop after N reported diffs (0 = unlimited)
 *   --ignore-field <label>    Ignore GFF fields by label (repeatable; substring match on path)
 *   --ignore-path <prefix>    Ignore archive/file paths starting with prefix (repeatable)
 *   --skip-binary             Do not report non-GFF binary content diffs (still reports size/presence)
 *   --json <file>             Write machine-readable JSON report
 *   --quiet                   Summary only
 *   -h, --help                Show help
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { ERFObject } from '../src/resource/ERFObject';
import { GFFObject } from '../src/resource/GFFObject';
import { ResourceTypes } from '../src/resource/ResourceTypes';

type DiffKind =
  | 'missing-left'
  | 'missing-right'
  | 'type-mismatch'
  | 'size'
  | 'binary'
  | 'gff-field'
  | 'gff-struct-id'
  | 'gff-data-type'
  | 'archive-entry';

interface DiffEntry {
  kind: DiffKind;
  path: string;
  left?: string;
  right?: string;
  detail?: string;
}

interface CompareOptions {
  floatEps: number;
  maxDiffs: number;
  ignoreFields: string[];
  ignorePaths: string[];
  skipBinary: boolean;
  quiet: boolean;
  labelLeft: string;
  labelRight: string;
  /** Align GFF list children by their Name field instead of index. */
  matchListByName: boolean;
  jsonOut?: string;
}

interface CompareStats {
  filesCompared: number;
  archivesOpened: number;
  gffsCompared: number;
  binaryCompared: number;
}

const ERF_EXTS = new Set(['.sav', '.erf', '.mod', '.hak', '.nwm']);
const ERF_MAGICS = new Set(['ERF ', 'MOD ', 'SAV ', 'HAK ', 'NWM ']);
const GFF_VERSION = 'V3.2';

/** Extensions commonly stored as GFF in saves (content may still be sniffed). */
const GFF_EXTS = new Set([
  '.gff', '.ifo', '.are', '.git', '.gic', '.utc', '.uti', '.utp', '.utd', '.ute',
  '.uts', '.utm', '.utw', '.utt', '.dlg', '.jrl', '.fac', '.pth', '.res', '.bic',
  '.gui', '.cut', '.ssf',
]);

const BINARY_SKIP_EXTS = new Set(['.tga', '.tpc', '.dds', '.bmp', '.jpg', '.png', '.wav', '.mp3']);

function printHelp(): void {
  console.log(`Compare two KotOR savegame folders (reference save vs KotOR.js).

Recursively walks folders, expands nested ERF/SAV archives, and diffs GFF
resources field-by-field using the project's GFFObject / ERFObject parsers.

Usage:
  npm run compare-saves -- <leftDir> <rightDir> [options]

Options:
  --label-left <name>       Label for left side (default: left)
  --label-right <name>      Label for right side (default: right)
  --float-eps <n>           Float/double equality epsilon (default: 1e-4)
  --max-diffs <n>           Stop after N reported diffs (0 = unlimited)
  --ignore-field <label>    Ignore GFF fields by label (repeatable; substring match on path)
  --ignore-path <prefix>    Ignore archive/file paths starting with prefix (repeatable)
  --match-list-by name      Align GFF list children by Name (e.g. GLOBALVARS Cat*)
  --skip-binary             Do not expand binary hash noise for screenshots/audio
  --json <file>             Write machine-readable JSON report
  --quiet                   Summary only
  -h, --help                Show help`);
}

function parseArgs(argv: string[]): { left?: string; right?: string; options: CompareOptions } {
  const options: CompareOptions = {
    floatEps: 1e-4,
    maxDiffs: 0,
    ignoreFields: [],
    ignorePaths: [],
    skipBinary: false,
    quiet: false,
    labelLeft: 'left',
    labelRight: 'right',
    matchListByName: false,
  };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
      case '--float-eps':
        options.floatEps = Number(next());
        break;
      case '--max-diffs':
        options.maxDiffs = Number(next());
        break;
      case '--ignore-field':
        options.ignoreFields.push(next());
        break;
      case '--ignore-path':
        options.ignorePaths.push(next().replace(/\\/g, '/').toLowerCase());
        break;
      case '--skip-binary':
        options.skipBinary = true;
        break;
      case '--quiet':
        options.quiet = true;
        break;
      case '--json':
        options.jsonOut = next();
        break;
      case '--label-left':
        options.labelLeft = next();
        break;
      case '--label-right':
        options.labelRight = next();
        break;
      case '--match-list-by': {
        const mode = next().toLowerCase();
        if (mode !== 'name') throw new Error(`Unsupported --match-list-by mode: ${mode} (use name)`);
        options.matchListByName = true;
        break;
      }
      default:
        if (a.startsWith('-')) throw new Error(`Unknown option: ${a}`);
        positional.push(a);
        break;
    }
  }

  return { left: positional[0], right: positional[1], options };
}

function toU8(data: Buffer | Uint8Array): Uint8Array {
  // Copy so BinaryReader's DataView matches the exact byte range.
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
  return readMagic4(buf, 4) === GFF_VERSION;
}

function resTypeName(resType: number): string {
  const key = ResourceTypes.getKeyByValue?.(resType);
  return typeof key === 'string' ? key : String(resType);
}

function entryKey(resRef: string, resType: number): string {
  return `${resRef.toLowerCase()}.${resTypeName(resType)}`;
}

function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\\/g, '/');
}

function shouldIgnorePath(resourcePath: string, options: CompareOptions): boolean {
  const p = resourcePath.replace(/\\/g, '/').toLowerCase();
  return options.ignorePaths.some((prefix) => p === prefix || p.startsWith(prefix.replace(/\/?$/, '/')));
}

function shouldIgnoreField(fieldPath: string, options: CompareOptions): boolean {
  if (!options.ignoreFields.length) return false;
  const lower = fieldPath.toLowerCase();
  return options.ignoreFields.some((f) => lower.includes(f.toLowerCase()));
}

function sha1(buf: Uint8Array): string {
  return createHash('sha1').update(buf).digest('hex');
}

function listFilesRecursive(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string, relBase: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      throw new Error(`Cannot read directory: ${dir}\n${(e as Error).message}`);
    }
    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      const rel = joinPath(relBase, ent.name);
      if (ent.isDirectory()) {
        walk(abs, rel);
      } else if (ent.isFile()) {
        out.set(rel.toLowerCase(), abs);
      }
    }
  };
  walk(root, '');
  return out;
}

async function loadErfFromBuffer(buf: Uint8Array): Promise<{ erf: ERFObject; buffer: Uint8Array }> {
  const buffer = toU8(buf);
  const erf = new ERFObject(buffer);
  await erf.load();
  return { erf, buffer };
}

/** Extract resource bytes without ERFObject.getResourceBuffer's in-memory off-by-one. */
function extractErfResource(erfBuffer: Uint8Array, offset: number, size: number): Uint8Array {
  if (!size || offset < 0 || offset + size > erfBuffer.byteLength) {
    return new Uint8Array(0);
  }
  return erfBuffer.slice(offset, offset + size);
}

function buildErfIndex(erf: ERFObject, erfBuffer: Uint8Array): Map<string, { resRef: string; resType: number; data: Uint8Array }> {
  const map = new Map<string, { resRef: string; resType: number; data: Uint8Array }>();
  for (let i = 0; i < erf.keyList.length; i++) {
    const key = erf.keyList[i];
    const res = erf.resources[key.resId];
    if (!res) continue;
    const data = extractErfResource(erfBuffer, res.offset, res.size);
    const k = entryKey(key.resRef, key.resType);
    map.set(k, { resRef: key.resRef, resType: key.resType, data });
  }
  return map;
}

function formatValue(v: unknown): string {
  if (v === undefined) return '<missing>';
  if (v === null) return 'null';
  if (typeof v === 'string') return JSON.stringify(v.length > 120 ? v.slice(0, 117) + '...' : v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 160 ? s.slice(0, 157) + '...' : s;
  } catch {
    return String(v);
  }
}

function numbersClose(a: number, b: number, eps: number): boolean {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= eps;
}

class DiffCollector {
  diffs: DiffEntry[] = [];
  truncated = false;
  constructor(private options: CompareOptions) {}

  get full(): boolean {
    return this.options.maxDiffs > 0 && this.diffs.length >= this.options.maxDiffs;
  }

  add(entry: DiffEntry): boolean {
    if (this.full) {
      this.truncated = true;
      return false;
    }
    if (shouldIgnorePath(entry.path, this.options)) return true;
    this.diffs.push(entry);
    if (!this.options.quiet) {
      this.print(entry);
    }
    return !this.full;
  }

  print(entry: DiffEntry): void {
    const L = this.options.labelLeft;
    const R = this.options.labelRight;
    switch (entry.kind) {
      case 'missing-left':
        console.log(`ONLY ${R}: ${entry.path}`);
        break;
      case 'missing-right':
        console.log(`ONLY ${L}: ${entry.path}`);
        break;
      case 'type-mismatch':
        console.log(`TYPE  ${entry.path}`);
        console.log(`  ${L}: ${entry.left}`);
        console.log(`  ${R}: ${entry.right}`);
        break;
      case 'size':
      case 'binary':
      case 'archive-entry':
      case 'gff-data-type':
      case 'gff-struct-id':
      case 'gff-field':
        console.log(`DIFF  ${entry.path}${entry.detail ? `  (${entry.detail})` : ''}`);
        if (entry.left !== undefined) console.log(`  ${L}: ${entry.left}`);
        if (entry.right !== undefined) console.log(`  ${R}: ${entry.right}`);
        break;
      default:
        console.log(`DIFF  ${entry.path}`);
        break;
    }
  }
}

function parseGffJson(buf: Uint8Array): any {
  const gff = new GFFObject(toU8(buf));
  return gff.toJSON();
}

function isFieldNode(node: any): boolean {
  return node && typeof node === 'object' && typeof node.type === 'string';
}

function structChildName(node: any): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const nameField = node.Name;
  if (!nameField || typeof nameField !== 'object') return undefined;
  if (nameField.type !== 'cexostring' && nameField.type !== 'resref') return undefined;
  if (nameField.value === undefined || nameField.value === null) return undefined;
  return String(nameField.value);
}

function listChildrenHaveNames(items: any[]): boolean {
  if (!items.length) return false;
  let named = 0;
  for (const item of items) {
    if (structChildName(item) !== undefined) named++;
  }
  return named >= Math.ceil(items.length / 2);
}

function diffGffListByName(
  la: any[],
  ra: any[],
  basePath: string,
  options: CompareOptions,
  collector: DiffCollector,
): void {
  const leftMap = new Map<string, any>();
  const rightMap = new Map<string, any>();
  const leftOrder: string[] = [];
  const rightOrder: string[] = [];

  for (let i = 0; i < la.length; i++) {
    const name = structChildName(la[i]) ?? `__index:${i}`;
    if (!leftMap.has(name)) leftOrder.push(name);
    leftMap.set(name, la[i]);
  }
  for (let i = 0; i < ra.length; i++) {
    const name = structChildName(ra[i]) ?? `__index:${i}`;
    if (!rightMap.has(name)) rightOrder.push(name);
    rightMap.set(name, ra[i]);
  }

  if (la.length !== ra.length) {
    collector.add({
      kind: 'gff-field',
      path: basePath,
      detail: 'list length',
      left: String(la.length),
      right: String(ra.length),
    });
  }

  const names = new Set([...leftOrder, ...rightOrder]);
  for (const name of [...names].sort((a, b) => a.localeCompare(b))) {
    if (collector.full) return;
    const childPath = `${basePath}[${JSON.stringify(name)}]`;
    const l = leftMap.get(name);
    const r = rightMap.get(name);
    if (l === undefined) {
      collector.add({ kind: 'missing-left', path: childPath, right: formatValue(r) });
      continue;
    }
    if (r === undefined) {
      collector.add({ kind: 'missing-right', path: childPath, left: formatValue(l) });
      continue;
    }
    diffGffNodes(l, r, childPath, options, collector);
  }
}

function diffGffNodes(
  left: any,
  right: any,
  basePath: string,
  options: CompareOptions,
  collector: DiffCollector,
): void {
  if (collector.full) return;
  if (shouldIgnoreField(basePath, options)) return;

  if (left === undefined && right === undefined) return;
  if (left === undefined) {
    collector.add({ kind: 'missing-left', path: basePath, right: formatValue(right) });
    return;
  }
  if (right === undefined) {
    collector.add({ kind: 'missing-right', path: basePath, left: formatValue(left) });
    return;
  }

  // Root / struct objects: keys are field labels (+ __struct_id / __data_type)
  if (!isFieldNode(left) && !isFieldNode(right) && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    if (left.__data_type !== undefined || right.__data_type !== undefined) {
      const lt = String(left.__data_type ?? '').trim();
      const rt = String(right.__data_type ?? '').trim();
      if (lt !== rt) {
        collector.add({
          kind: 'gff-data-type',
          path: joinPath(basePath, '__data_type'),
          left: lt || '<empty>',
          right: rt || '<empty>',
        });
      }
    }
    if (left.__struct_id !== undefined || right.__struct_id !== undefined) {
      if (left.__struct_id !== right.__struct_id) {
        collector.add({
          kind: 'gff-struct-id',
          path: joinPath(basePath, '__struct_id'),
          left: formatValue(left.__struct_id),
          right: formatValue(right.__struct_id),
        });
      }
    }

    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of [...keys].sort()) {
      if (key === '__struct_id' || key === '__data_type') continue;
      diffGffNodes(left[key], right[key], joinPath(basePath, key), options, collector);
      if (collector.full) return;
    }
    return;
  }

  // Field nodes
  if (isFieldNode(left) || isFieldNode(right)) {
    if (!isFieldNode(left) || !isFieldNode(right)) {
      collector.add({
        kind: 'type-mismatch',
        path: basePath,
        left: isFieldNode(left) ? left.type : typeof left,
        right: isFieldNode(right) ? right.type : typeof right,
      });
      return;
    }
    if (left.type !== right.type) {
      collector.add({
        kind: 'type-mismatch',
        path: basePath,
        left: left.type,
        right: right.type,
      });
      return;
    }

    const t = left.type as string;
    if (t === 'struct') {
      diffGffNodes(left.value ?? {}, right.value ?? {}, basePath, options, collector);
      return;
    }
    if (t === 'list') {
      const la = Array.isArray(left.value) ? left.value : [];
      const ra = Array.isArray(right.value) ? right.value : [];
      if (options.matchListByName && (listChildrenHaveNames(la) || listChildrenHaveNames(ra))) {
        diffGffListByName(la, ra, basePath, options, collector);
        return;
      }
      const n = Math.max(la.length, ra.length);
      if (la.length !== ra.length) {
        collector.add({
          kind: 'gff-field',
          path: basePath,
          detail: 'list length',
          left: String(la.length),
          right: String(ra.length),
        });
      }
      for (let i = 0; i < n; i++) {
        diffGffNodes(la[i], ra[i], `${basePath}[${i}]`, options, collector);
        if (collector.full) return;
      }
      return;
    }
    if (t === 'float' || t === 'double') {
      const lv = Number(left.value);
      const rv = Number(right.value);
      if (!numbersClose(lv, rv, options.floatEps)) {
        collector.add({
          kind: 'gff-field',
          path: basePath,
          detail: t,
          left: formatValue(lv),
          right: formatValue(rv),
        });
      }
      return;
    }
    if (t === 'vector' || t === 'orientation') {
      const lv = left.value || {};
      const rv = right.value || {};
      const comps = t === 'vector' ? ['x', 'y', 'z'] : ['x', 'y', 'z', 'w'];
      for (const c of comps) {
        const a = Number(lv[c] ?? 0);
        const b = Number(rv[c] ?? 0);
        if (!numbersClose(a, b, options.floatEps)) {
          collector.add({
            kind: 'gff-field',
            path: joinPath(basePath, c),
            detail: t,
            left: formatValue(a),
            right: formatValue(b),
          });
        }
      }
      return;
    }
    if (t === 'void') {
      const lv = String(left.value64 ?? '');
      const rv = String(right.value64 ?? '');
      if (lv !== rv) {
        collector.add({
          kind: 'gff-field',
          path: basePath,
          detail: 'void',
          left: `base64:${lv.length} chars`,
          right: `base64:${rv.length} chars`,
        });
      }
      return;
    }
    if (t === 'cexolocstring') {
      const lv = left.value || {};
      const rv = right.value || {};
      const keys = new Set([...Object.keys(lv), ...Object.keys(rv)]);
      for (const key of [...keys].sort()) {
        if (String(lv[key] ?? '') !== String(rv[key] ?? '')) {
          collector.add({
            kind: 'gff-field',
            path: joinPath(basePath, key),
            detail: 'cexolocstring',
            left: formatValue(lv[key]),
            right: formatValue(rv[key]),
          });
        }
      }
      return;
    }

    // dword64 / int64 may be number or string
    const ls = left.value !== undefined ? String(left.value) : String(left.value64 ?? '');
    const rs = right.value !== undefined ? String(right.value) : String(right.value64 ?? '');
    if (ls !== rs) {
      // numeric string compare for integer-ish types
      if (['byte', 'char', 'word', 'short', 'dword', 'int', 'dword64', 'int64'].includes(t)) {
        if (ls === rs) return;
        const ln = Number(ls);
        const rn = Number(rs);
        if (Number.isFinite(ln) && Number.isFinite(rn) && ln === rn) return;
      }
      collector.add({
        kind: 'gff-field',
        path: basePath,
        detail: t,
        left: formatValue(left.value ?? left.value64),
        right: formatValue(right.value ?? right.value64),
      });
    }
    return;
  }

  // Fallback
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    collector.add({
      kind: 'gff-field',
      path: basePath,
      left: formatValue(left),
      right: formatValue(right),
    });
  }
}

async function compareBuffers(
  leftBuf: Uint8Array | undefined,
  rightBuf: Uint8Array | undefined,
  resourcePath: string,
  options: CompareOptions,
  collector: DiffCollector,
  stats: CompareStats,
  hintExt?: string,
): Promise<void> {
  if (collector.full) return;
  if (shouldIgnorePath(resourcePath, options)) return;

  if (!leftBuf && !rightBuf) return;
  if (!leftBuf) {
    collector.add({ kind: 'missing-left', path: resourcePath, right: `${rightBuf!.byteLength} bytes` });
    return;
  }
  if (!rightBuf) {
    collector.add({ kind: 'missing-right', path: resourcePath, left: `${leftBuf.byteLength} bytes` });
    return;
  }

  const ext = (hintExt || path.extname(resourcePath)).toLowerCase();
  const leftIsErf = ERF_EXTS.has(ext) || isErfBuffer(leftBuf);
  const rightIsErf = ERF_EXTS.has(ext) || isErfBuffer(rightBuf);

  if (leftIsErf || rightIsErf) {
    if (!leftIsErf || !rightIsErf) {
      collector.add({
        kind: 'type-mismatch',
        path: resourcePath,
        left: leftIsErf ? 'ERF/SAV' : `raw(${leftBuf.byteLength})`,
        right: rightIsErf ? 'ERF/SAV' : `raw(${rightBuf.byteLength})`,
      });
      return;
    }
    await compareErfBuffers(leftBuf, rightBuf, resourcePath, options, collector, stats);
    return;
  }

  const leftIsGff = GFF_EXTS.has(ext) || isGffBuffer(leftBuf);
  const rightIsGff = GFF_EXTS.has(ext) || isGffBuffer(rightBuf);

  if (leftIsGff || rightIsGff) {
    if (!leftIsGff || !rightIsGff) {
      collector.add({
        kind: 'type-mismatch',
        path: resourcePath,
        left: leftIsGff ? 'GFF' : `raw(${leftBuf.byteLength})`,
        right: rightIsGff ? 'GFF' : `raw(${rightBuf.byteLength})`,
      });
      return;
    }
    stats.gffsCompared++;
    try {
      const lj = parseGffJson(leftBuf);
      const rj = parseGffJson(rightBuf);
      diffGffNodes(lj, rj, resourcePath, options, collector);
    } catch (e) {
      collector.add({
        kind: 'binary',
        path: resourcePath,
        detail: `GFF parse failed: ${(e as Error).message}`,
        left: `${leftBuf.byteLength} bytes sha1=${sha1(leftBuf).slice(0, 12)}`,
        right: `${rightBuf.byteLength} bytes sha1=${sha1(rightBuf).slice(0, 12)}`,
      });
    }
    return;
  }

  stats.binaryCompared++;
  if (leftBuf.byteLength !== rightBuf.byteLength) {
    collector.add({
      kind: 'size',
      path: resourcePath,
      left: `${leftBuf.byteLength} bytes`,
      right: `${rightBuf.byteLength} bytes`,
    });
    return;
  }
  if (options.skipBinary || BINARY_SKIP_EXTS.has(ext)) {
    // Still detect inequality via hash, but keep the report short.
    const lh = sha1(leftBuf);
    const rh = sha1(rightBuf);
    if (lh !== rh) {
      collector.add({
        kind: 'binary',
        path: resourcePath,
        detail: options.skipBinary ? 'content hash differs (binary skipped detail)' : 'binary content differs',
        left: lh.slice(0, 12),
        right: rh.slice(0, 12),
      });
    }
    return;
  }
  const lh = sha1(leftBuf);
  const rh = sha1(rightBuf);
  if (lh !== rh) {
    collector.add({
      kind: 'binary',
      path: resourcePath,
      detail: 'content hash differs',
      left: lh.slice(0, 12),
      right: rh.slice(0, 12),
    });
  }
}

async function compareErfBuffers(
  leftBuf: Uint8Array,
  rightBuf: Uint8Array,
  archivePath: string,
  options: CompareOptions,
  collector: DiffCollector,
  stats: CompareStats,
): Promise<void> {
  stats.archivesOpened++;
  const left = await loadErfFromBuffer(leftBuf);
  const right = await loadErfFromBuffer(rightBuf);
  const leftIndex = buildErfIndex(left.erf, left.buffer);
  const rightIndex = buildErfIndex(right.erf, right.buffer);

  const keys = new Set([...leftIndex.keys(), ...rightIndex.keys()]);
  const sorted = [...keys].sort();
  for (const key of sorted) {
    if (collector.full) return;
    const childPath = joinPath(archivePath, key);
    const l = leftIndex.get(key);
    const r = rightIndex.get(key);
    if (!l) {
      collector.add({ kind: 'missing-left', path: childPath, right: `${r!.data.byteLength} bytes` });
      continue;
    }
    if (!r) {
      collector.add({ kind: 'missing-right', path: childPath, left: `${l.data.byteLength} bytes` });
      continue;
    }
    const hint = '.' + resTypeName(l.resType);
    await compareBuffers(l.data, r.data, childPath, options, collector, stats, hint);
  }
}

async function compareFolders(leftDir: string, rightDir: string, options: CompareOptions): Promise<{ diffs: DiffEntry[]; stats: CompareStats; truncated: boolean }> {
  const collector = new DiffCollector(options);
  const stats: CompareStats = {
    filesCompared: 0,
    archivesOpened: 0,
    gffsCompared: 0,
    binaryCompared: 0,
  };

  const leftFiles = listFilesRecursive(leftDir);
  const rightFiles = listFilesRecursive(rightDir);
  const names = new Set([...leftFiles.keys(), ...rightFiles.keys()]);

  for (const rel of [...names].sort()) {
    if (collector.full) break;
    const leftAbs = leftFiles.get(rel);
    const rightAbs = rightFiles.get(rel);
    const displayPath = leftAbs
      ? path.relative(leftDir, leftAbs).replace(/\\/g, '/')
      : path.relative(rightDir, rightAbs!).replace(/\\/g, '/');

    if (shouldIgnorePath(displayPath, options)) continue;

    if (!leftAbs) {
      collector.add({ kind: 'missing-left', path: displayPath });
      continue;
    }
    if (!rightAbs) {
      collector.add({ kind: 'missing-right', path: displayPath });
      continue;
    }

    stats.filesCompared++;
    const leftBuf = toU8(fs.readFileSync(leftAbs));
    const rightBuf = toU8(fs.readFileSync(rightAbs));
    await compareBuffers(leftBuf, rightBuf, displayPath, options, collector, stats, path.extname(displayPath));
  }

  return { diffs: collector.diffs, stats, truncated: collector.truncated };
}

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error((e as Error).message);
    process.exit(2);
  }

  const { left, right, options } = parsed;
  if (!left || !right) {
    console.error('Usage: npm run compare-saves -- <leftDir> <rightDir> [options]');
    console.error('Run with --help for details.');
    process.exit(2);
  }

  const leftDir = path.resolve(left);
  const rightDir = path.resolve(right);
  if (!fs.existsSync(leftDir) || !fs.statSync(leftDir).isDirectory()) {
    console.error(`Left path is not a directory: ${leftDir}`);
    process.exit(2);
  }
  if (!fs.existsSync(rightDir) || !fs.statSync(rightDir).isDirectory()) {
    console.error(`Right path is not a directory: ${rightDir}`);
    process.exit(2);
  }

  if (!options.quiet) {
    console.log(`Comparing save folders`);
    console.log(`  ${options.labelLeft}:  ${leftDir}`);
    console.log(`  ${options.labelRight}: ${rightDir}`);
    console.log('');
  }

  const { diffs, stats, truncated } = await compareFolders(leftDir, rightDir, options);

  console.log('');
  console.log('--- Summary ---');
  console.log(`Files compared:     ${stats.filesCompared}`);
  console.log(`Archives opened:    ${stats.archivesOpened}`);
  console.log(`GFF resources:      ${stats.gffsCompared}`);
  console.log(`Binary resources:   ${stats.binaryCompared}`);
  console.log(`Diffs reported:     ${diffs.length}${truncated ? ' (truncated)' : ''}`);

  if (options.jsonOut) {
    const report = {
      left: leftDir,
      right: rightDir,
      labelLeft: options.labelLeft,
      labelRight: options.labelRight,
      floatEps: options.floatEps,
      truncated,
      stats,
      diffs,
    };
    fs.writeFileSync(options.jsonOut, JSON.stringify(report, null, 2), 'utf8');
    console.log(`JSON report:        ${path.resolve(options.jsonOut)}`);
  }

  process.exit(diffs.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
