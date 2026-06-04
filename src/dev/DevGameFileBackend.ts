/**
 * Dev HMR helper: read game assets over webpack dev-server middleware when
 * KOTOR_DEV_GAME_DIR is set (browser cannot use native paths directly).
 */

const DEV_FS_BASE = '/__kotor_dev_fs';

export function isDevGameFileBackendActive(): boolean {
  return (
    process.env.NODE_ENV !== 'production'
    && typeof process.env.KOTOR_DEV_GAME_DIR === 'string'
    && process.env.KOTOR_DEV_GAME_DIR.length > 0
  );
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function apiUrl(action: string, filePath: string, extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams({
    action,
    path: filePath,
  });
  for (const [key, value] of Object.entries(extra)) {
    params.set(key, String(value));
  }
  return `${DEV_FS_BASE}?${params.toString()}`;
}

/** In-memory virtual write store for gameinprogress (browser has no directory handle). */
const virtualFiles = new Map<string, Uint8Array>();
const virtualDirs = new Set<string>();

/** Byte cache for read-only disk assets (partial reads via open/read). */
const fileByteCache = new Map<string, Uint8Array>();

type DevStatPayload = {
  exists: boolean;
  isFile?: boolean;
  isDirectory?: boolean;
  size?: number;
};

/** Cached stat results — bootstrap issues thousands of duplicate exists() checks. */
const statCache = new Map<string, DevStatPayload>();
const statInflight = new Map<string, Promise<DevStatPayload>>();

async function fetchStat(filePath: string): Promise<DevStatPayload> {
  const normalized = normalizePath(filePath);
  const cached = statCache.get(normalized);
  if (cached) {
    return cached;
  }
  const inflight = statInflight.get(normalized);
  if (inflight) {
    return inflight;
  }

  const promise = (async () => {
    const response = await fetch(apiUrl('stat', normalized));
    if (!response.ok) {
      return { exists: false, isDirectory: false, isFile: false };
    }
    const data = await response.json() as DevStatPayload;
    const payload: DevStatPayload = {
      exists: !!data.exists,
      isDirectory: !!data.isDirectory,
      isFile: !!data.isFile,
      size: data.size,
    };
    statCache.set(normalized, payload);
    return payload;
  })();

  statInflight.set(normalized, promise);
  try {
    return await promise;
  } finally {
    statInflight.delete(normalized);
  }
}

export class DevGameFileHandle {
  readonly kind = 'dev-game-file' as const;
  readonly path: string;
  readonly mode: 'r' | 'w';

  constructor(filePath: string, mode: 'r' | 'w' = 'r') {
    this.path = normalizePath(filePath);
    this.mode = mode;
  }
}

export function isDevGameFileHandle(handle: unknown): handle is DevGameFileHandle {
  return handle instanceof DevGameFileHandle
    || (typeof handle === 'object' && handle !== null && (handle as DevGameFileHandle).kind === 'dev-game-file');
}

function virtualFileExists(filePath: string): boolean {
  return virtualFiles.has(normalizePath(filePath));
}

function virtualDirExists(dirPath: string): boolean {
  const normalized = normalizePath(dirPath);
  if (virtualDirs.has(normalized)) {
    return true;
  }
  const prefix = normalized ? `${normalized}/` : '';
  for (const filePath of virtualFiles.keys()) {
    if (filePath.startsWith(prefix)) {
      return true;
    }
  }
  for (const dir of virtualDirs) {
    if (dir.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

function listVirtualDirEntries(dirPath: string): string[] {
  const normalized = normalizePath(dirPath);
  const prefix = normalized ? `${normalized}/` : '';
  const entries = new Set<string>();

  for (const filePath of virtualFiles.keys()) {
    if (normalized && !filePath.startsWith(prefix)) {
      continue;
    }
    const remainder = normalized ? filePath.slice(prefix.length) : filePath;
    const slash = remainder.indexOf('/');
    if (slash >= 0) {
      entries.add(`${remainder.slice(0, slash)}/`);
    } else if (remainder) {
      entries.add(remainder);
    }
  }

  for (const dir of virtualDirs) {
    if (normalized && !dir.startsWith(prefix)) {
      continue;
    }
    const remainder = normalized ? dir.slice(prefix.length) : dir;
    const slash = remainder.indexOf('/');
    if (slash >= 0) {
      entries.add(`${remainder.slice(0, slash)}/`);
    } else if (remainder) {
      entries.add(`${remainder}/`);
    }
  }

  return [...entries];
}

function ensureVirtualParentDirs(filePath: string): void {
  const normalized = normalizePath(filePath);
  const parts = normalized.split('/');
  parts.pop();
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    virtualDirs.add(current);
  }
}

export function devGameVirtualWrite(filePath: string, data: Uint8Array): void {
  const normalized = normalizePath(filePath);
  ensureVirtualParentDirs(normalized);
  virtualFiles.set(normalized, data);
}

export function devGameVirtualMkdir(dirPath: string, recursive = false): boolean {
  const normalized = normalizePath(dirPath);
  if (!normalized) {
    return false;
  }
  if (recursive) {
    const parts = normalized.split('/');
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      virtualDirs.add(current);
    }
  } else {
    virtualDirs.add(normalized);
  }
  return true;
}

export function devGameVirtualRmdir(dirPath: string, recursive = false): boolean {
  const normalized = normalizePath(dirPath);
  if (!normalized) {
    return false;
  }
  const prefix = `${normalized}/`;

  if (recursive) {
    for (const filePath of [...virtualFiles.keys()]) {
      if (filePath === normalized || filePath.startsWith(prefix)) {
        virtualFiles.delete(filePath);
      }
    }
    for (const dir of [...virtualDirs]) {
      if (dir === normalized || dir.startsWith(prefix)) {
        virtualDirs.delete(dir);
      }
    }
  } else {
    for (const filePath of virtualFiles.keys()) {
      if (filePath.startsWith(prefix)) {
        return false;
      }
    }
    for (const dir of virtualDirs) {
      if (dir.startsWith(prefix)) {
        return false;
      }
    }
    virtualDirs.delete(normalized);
  }
  return true;
}

export async function devGameExists(filePath: string): Promise<boolean> {
  const normalized = normalizePath(filePath);
  if (virtualFileExists(normalized)) {
    return true;
  }
  if (virtualDirExists(normalized)) {
    return true;
  }

  const data = await fetchStat(normalized);
  if (!data.exists) {
    return false;
  }
  const hasExt = /\.[^/]+$/.test(normalized.split('/').pop() || '');
  return hasExt ? !!data.isFile : !!data.isDirectory;
}

async function loadFileBytes(filePath: string): Promise<Uint8Array> {
  const normalized = normalizePath(filePath);
  if (virtualFiles.has(normalized)) {
    return virtualFiles.get(normalized)!;
  }
  if (fileByteCache.has(normalized)) {
    return fileByteCache.get(normalized)!;
  }
  const response = await fetch(apiUrl('read', normalized));
  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      detail = '';
    }
    const suffix = detail ? ` (HTTP ${response.status}: ${detail})` : ` (HTTP ${response.status})`;
    throw new Error(`DevGameFileBackend read failed: ${normalized}${suffix}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  fileByteCache.set(normalized, bytes);
  return bytes;
}

export async function devGameReadFile(filePath: string): Promise<Uint8Array> {
  return loadFileBytes(filePath);
}

export async function devGameOpen(filePath: string, mode: 'r' | 'w' = 'r'): Promise<DevGameFileHandle> {
  const normalized = normalizePath(filePath);
  if (mode === 'w') {
    ensureVirtualParentDirs(normalized);
    return new DevGameFileHandle(normalized, 'w');
  }
  if (!(await devGameExists(normalized))) {
    throw new Error(`DevGameFileBackend open failed: ${normalized}`);
  }
  return new DevGameFileHandle(normalized, 'r');
}

export async function devGameRead(
  handle: DevGameFileHandle,
  output: Uint8Array,
  offset: number,
  length: number,
  position: number,
): Promise<void> {
  if (virtualFiles.has(handle.path)) {
    const bytes = virtualFiles.get(handle.path)!;
    output.set(bytes.subarray(position, position + length), offset);
    return;
  }
  if (fileByteCache.has(handle.path)) {
    const bytes = fileByteCache.get(handle.path)!;
    output.set(bytes.subarray(position, position + length), offset);
    return;
  }
  const response = await fetch(apiUrl('read', handle.path, { offset: position, length }));
  if (!response.ok) {
    throw new Error(`DevGameFileBackend read failed: ${handle.path} @ ${position}+${length}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  output.set(bytes, offset);
}

export async function devGameClose(_handle: DevGameFileHandle): Promise<void> {
  return;
}

export interface IDevReaddirOptions {
  recursive?: boolean;
  list_dirs?: boolean;
}

export async function devGameReaddir(
  dirPath: string,
  options: IDevReaddirOptions = {},
): Promise<string[]> {
  const resourcePath = normalizePath(dirPath);
  const files: string[] = [];
  await devGameReaddirWalk(resourcePath, options, files, 0);

  const virtualEntries = listVirtualDirEntries(resourcePath);
  for (const entry of virtualEntries) {
    const isDir = entry.endsWith('/');
    const name = isDir ? entry.slice(0, -1) : entry;
    const childPath = resourcePath ? `${resourcePath}/${name}` : name;
    if (isDir) {
      if (options.recursive) {
        await devGameReaddirWalk(childPath, options, files, 1);
      } else {
        if (!files.includes(childPath)) {
          files.push(childPath);
        }
      }
    } else if (!options.list_dirs && !files.includes(childPath)) {
      files.push(childPath);
    }
  }

  return files;
}

async function devGameReaddirWalk(
  resourcePath: string,
  options: IDevReaddirOptions,
  files: string[],
  depth: number,
): Promise<void> {
  const response = await fetch(apiUrl('readdir', resourcePath));
  if (!response.ok) {
    if (!options.list_dirs && depth === 0 && virtualDirExists(resourcePath)) {
      return;
    }
    if (!options.list_dirs && depth > 0) {
      files.push(resourcePath);
    }
    return;
  }

  const data = await response.json() as { entries?: string[] };
  const entries = data.entries || [];

  if (options.list_dirs && depth > 0) {
    files.push(resourcePath);
  }

  if (depth >= 1 && !options.recursive) {
    return;
  }

  for (const entry of entries) {
    const isDir = entry.endsWith('/');
    const name = isDir ? entry.slice(0, -1) : entry;
    const childPath = resourcePath ? `${resourcePath}/${name}` : name;
    if (isDir) {
      if (options.recursive) {
        await devGameReaddirWalk(childPath, options, files, depth + 1);
      } else {
        files.push(childPath);
      }
    } else if (!options.list_dirs) {
      files.push(childPath);
    }
  }
}
