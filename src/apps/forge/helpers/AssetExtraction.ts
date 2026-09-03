import * as KotOR from "@/apps/forge/KotOR";
import * as fs from "fs";
import * as path from "path";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { TXI } from "@/resource/TXI";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ModalExtractionResultsState, ExtractionResults } from "@/apps/forge/states/modal/ModalExtractionResultsState";
import { ModalExtractionProgressState } from "@/apps/forge/states/modal/ModalExtractionProgressState";

declare const dialog: any;

export type ExportTarget =
  | { type: 'electron'; path: string }
  | { type: 'browser'; handle: FileSystemDirectoryHandle };

export const WRITE_CONCURRENCY = 4;

export type ProgressCallback = (current: number, total: number, message: string) => void;

interface CollectedAssets {
  models: Set<string>;
  textures: Set<string>;
}

interface BrowserDestCache {
  dirs: Map<string, FileSystemDirectoryHandle>;
  files: Map<string, Set<string>>;
  inflight: Map<string, Promise<{ dir: FileSystemDirectoryHandle; names: Set<string> }>>;
}

const destCaches = new WeakMap<FileSystemDirectoryHandle, BrowserDestCache>();

function getBrowserDestCache(handle: FileSystemDirectoryHandle): BrowserDestCache {
  let cache = destCaches.get(handle);
  if (!cache) {
    cache = { dirs: new Map(), files: new Map(), inflight: new Map() };
    destCaches.set(handle, cache);
  }
  return cache;
}

function splitExportPath(filename: string): { parts: string[]; fileName: string } | undefined {
  const normalized = filename.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) {
    return undefined;
  }
  return { parts, fileName };
}

async function enumerateDirNames(dirHandle: FileSystemDirectoryHandle): Promise<Set<string>> {
  const names = new Set<string>();
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      names.add(entry.name);
    }
  }
  return names;
}

async function resolveBrowserDestDir(
  target: Extract<ExportTarget, { type: 'browser' }>,
  parts: string[],
  create: boolean,
): Promise<{ dir: FileSystemDirectoryHandle; names: Set<string> } | undefined> {
  const cache = getBrowserDestCache(target.handle);
  const key = parts.join('/');
  const cachedDir = cache.dirs.get(key);
  const cachedNames = cache.files.get(key);
  if (cachedDir && cachedNames) {
    return { dir: cachedDir, names: cachedNames };
  }
  const inflight = cache.inflight.get(key);
  if (inflight) {
    return inflight;
  }
  const promise = (async () => {
    let dirHandle = target.handle;
    for (const segment of parts) {
      dirHandle = await dirHandle.getDirectoryHandle(segment, { create });
    }
    const names = await enumerateDirNames(dirHandle);
    cache.dirs.set(key, dirHandle);
    cache.files.set(key, names);
    cache.inflight.delete(key);
    return { dir: dirHandle, names };
  })().catch((e) => {
    cache.inflight.delete(key);
    throw e;
  });
  cache.inflight.set(key, promise);
  return promise;
}

export async function promptForDirectory(defaultName: string): Promise<ExportTarget | undefined> {
  try {
    if (KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON) {
      const savePath = await dialog.showSaveDialog({
        title: 'Choose export directory',
        defaultPath: defaultName,
        properties: ['openDirectory', 'createDirectory'],
      });
      if (!savePath || savePath.cancelled || !savePath.filePath) {
        return undefined;
      }
      return { type: 'electron', path: savePath.filePath };
    } else {
      const directoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      if (!directoryHandle) {
        return undefined;
      }
      return { type: 'browser', handle: directoryHandle };
    }
  } catch (e) {
    return undefined;
  }
}

export async function fileExists(filename: string, target: ExportTarget): Promise<boolean> {
  if (target.type === 'electron') {
    return new Promise<boolean>((resolve) => {
      fs.access(`${target.path}/${filename}`, (err) => resolve(!err));
    });
  } else {
    try {
      const split = splitExportPath(filename);
      if (!split) return false;
      const resolved = await resolveBrowserDestDir(target, split.parts, false);
      if (!resolved) return false;
      return resolved.names.has(split.fileName);
    } catch {
      return false;
    }
  }
}

export async function writeFile(filename: string, buffer: Uint8Array, target: ExportTarget): Promise<void> {
  if (target.type === 'electron') {
    const fullpath = path.join(target.path, filename);
    const dirpath = path.dirname(fullpath);
    await fs.promises.mkdir(dirpath, { recursive: true });
    await new Promise<void>((resolve, reject) => {
      fs.writeFile(fullpath, buffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } else {
    const split = splitExportPath(filename);
    if (!split) {
      throw new Error(`Invalid filename '${filename}'`);
    }

    const resolved = await resolveBrowserDestDir(target, split.parts, true);
    if (!resolved) {
      throw new Error(`Failed to resolve export directory for '${filename}'`);
    }

    const fileHandle = await resolved.dir.getFileHandle(split.fileName, { create: true });
    const ws: FileSystemWritableFileStream = await fileHandle.createWritable();
    await ws.write(buffer as any);
    await ws.close();
    resolved.names.add(split.fileName);
  }
}

function normalizeArchivePath(archivePath: string): string {
  return String(archivePath ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
}

export interface ParsedGameResourceUri {
  scheme: string;
  pathname: string;
  resref?: string;
  restype?: string;
  reskey?: number;
}

export function parseGameResourceUri(uri: string): ParsedGameResourceUri | undefined {
  if (!uri) {
    return undefined;
  }
  try {
    const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(uri.trim());
    if (!hasProtocol) {
      return { scheme: 'file', pathname: uri.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') };
    }
    const u = new URL(uri.trim());
    const scheme = u.protocol.replace(/:$/, '').toLowerCase();
    let pathname = decodeURIComponent(u.pathname || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const host = (u.hostname || '').toLowerCase();
    if (host && host !== 'game.dir' && host !== 'project.dir' && host !== 'system.dir') {
      pathname = pathname ? `${u.hostname}/${pathname}` : u.hostname;
    } else if (pathname.toLowerCase().startsWith('game.dir/')) {
      pathname = pathname.slice('game.dir/'.length);
    } else if (pathname.toLowerCase() === 'game.dir') {
      pathname = '';
    }
    const resref = u.searchParams.get('resref') || undefined;
    const restype = (u.searchParams.get('restype') || '').toLowerCase() || undefined;
    const reskey = restype ? KotOR.ResourceTypes[restype] : undefined;
    return { scheme, pathname, resref, restype, reskey };
  } catch {
    return undefined;
  }
}

type ArchiveKind = 'bif' | 'erf' | 'rim';
type LoadedArchive = KotOR.BIFObject | KotOR.ERFObject | KotOR.RIMObject;

interface CachedArchive {
  kind: ArchiveKind;
  archive: LoadedArchive;
  owned: boolean;
}

export class ArchiveReadCache {
  private archives = new Map<string, Promise<CachedArchive>>();

  private cacheKey(kind: ArchiveKind, archivePath: string): string {
    return `${kind}:${normalizeArchivePath(archivePath)}`;
  }

  private async loadArchive(kind: ArchiveKind, archivePath: string): Promise<CachedArchive> {
    if (kind === 'bif') {
      const existing = KotOR.BIFManager.FindByPath(archivePath);
      if (existing) {
        return { kind, archive: existing, owned: false };
      }
      const bif = new KotOR.BIFObject(archivePath);
      await bif.load();
      return { kind, archive: bif, owned: true };
    }
    if (kind === 'rim') {
      const existing = KotOR.RIMManager.FindByPath(archivePath);
      if (existing) {
        return { kind, archive: existing, owned: false };
      }
      const rim = new KotOR.RIMObject(archivePath);
      await rim.load();
      return { kind, archive: rim, owned: true };
    }
    const existing = KotOR.ERFManager.FindByPath(archivePath);
    if (existing) {
      return { kind, archive: existing, owned: false };
    }
    const erf = new KotOR.ERFObject(archivePath);
    await erf.load();
    return { kind, archive: erf, owned: true };
  }

  private getArchive(kind: ArchiveKind, archivePath: string): Promise<CachedArchive> {
    const key = this.cacheKey(kind, archivePath);
    let pending = this.archives.get(key);
    if (!pending) {
      pending = this.loadArchive(kind, archivePath).catch((e) => {
        this.archives.delete(key);
        throw e;
      });
      this.archives.set(key, pending);
    }
    return pending;
  }

  async read(uri: string): Promise<Uint8Array> {
    const ref = parseGameResourceUri(uri);
    if (!ref) {
      return new Uint8Array(0);
    }
    if (ref.scheme === 'file' || !ref.resref) {
      if (!ref.pathname) {
        return new Uint8Array(0);
      }
      return KotOR.GameFileSystem.readFile(ref.pathname);
    }
    const kind: ArchiveKind = ref.scheme === 'bif' ? 'bif' : ref.scheme === 'rim' ? 'rim' : 'erf';
    const cached = await this.getArchive(kind, ref.pathname);
    const reskey = typeof ref.reskey === 'number' ? ref.reskey : 0;
    if (cached.kind === 'bif') {
      return (cached.archive as KotOR.BIFObject).getResourceBufferByResRef(ref.resref, reskey);
    }
    if (cached.kind === 'rim') {
      const buffer = await (cached.archive as KotOR.RIMObject).getResourceBufferByResRef(ref.resref, reskey);
      return buffer || new Uint8Array(0);
    }
    return (cached.archive as KotOR.ERFObject).getResourceBufferByResRef(ref.resref, reskey);
  }

  async dispose(): Promise<void> {
    const loaded = await Promise.all(this.archives.values());
    for (const entry of loaded) {
      if (entry.owned && typeof (entry.archive as any).dispose === 'function') {
        await (entry.archive as any).dispose();
      }
    }
    this.archives.clear();
  }
}

export function createThrottledProgress(
  onProgress?: ProgressCallback,
  intervalMs = 100,
): ProgressCallback & { flush: () => void } {
  if (!onProgress) {
    const noop = ((() => {}) as ProgressCallback & { flush: () => void });
    noop.flush = () => {};
    return noop;
  }
  let lastSent = 0;
  let lastArgs: [number, number, string] | undefined;
  const fn = ((current: number, total: number, message: string) => {
    lastArgs = [current, total, message];
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (current >= total || now - lastSent >= intervalMs) {
      lastSent = now;
      onProgress(current, total, message);
      lastArgs = undefined;
    }
  }) as ProgressCallback & { flush: () => void };
  fn.flush = () => {
    if (lastArgs) {
      onProgress(...lastArgs);
      lastArgs = undefined;
    }
  };
  return fn;
}

export function createConcurrencyGate(limit: number) {
  let active = 0;
  const waiters: Array<() => void> = [];
  return {
    async acquire() {
      if (active >= limit) {
        await new Promise<void>((resolve) => waiters.push(resolve));
      } else {
        active++;
      }
    },
    release() {
      const next = waiters.shift();
      if (next) {
        next();
      } else {
        active--;
      }
    },
  };
}

function collectNodeAssets(node: KotOR.OdysseyModelNode, assets: CollectedAssets): void {
  if (node instanceof KotOR.OdysseyModelNodeMesh) {
    const maps = [node.textureMap1, node.textureMap2, node.textureMap3, node.textureMap4];
    for (const map of maps) {
      if (map && map.length) {
        assets.textures.add(map.toLowerCase());
      }
    }
  }

  if (node instanceof KotOR.OdysseyModelNodeEmitter) {
    if (node.textureResRef && node.textureResRef.length) {
      assets.textures.add(node.textureResRef.toLowerCase());
    }
  }

  if (node instanceof KotOR.OdysseyModelNodeLight) {
    if (node.flare?.textures) {
      for (const tex of node.flare.textures) {
        if (tex && tex.length) {
          assets.textures.add(tex.toLowerCase());
        }
      }
    }
  }

  if (node instanceof KotOR.OdysseyModelNodeReference) {
    if (node.modelName && node.modelName.length) {
      assets.models.add(node.modelName.toLowerCase().trim());
    }
  }

  if (node.children) {
    for (const child of node.children) {
      collectNodeAssets(child, assets);
    }
  }
}

export async function collectModelAssets(
  resref: string,
  visited: Set<string>,
  allModels: Set<string>,
  allTextures: Set<string>,
  primaryMdl?: Uint8Array,
  primaryMdx?: Uint8Array,
  /** When the open file is `*.mdl.ascii` (no MDX), use the already-parsed model from the viewer. */
  primaryOdysseyModel?: KotOR.OdysseyModel,
): Promise<void> {
  resref = resref.toLowerCase().trim();
  if (!resref || visited.has(resref)) return;
  visited.add(resref);
  allModels.add(resref);

  let odysseyModel: KotOR.OdysseyModel | undefined;
  try {
    const primaryParsedName = primaryOdysseyModel?.geometryHeader?.modelName?.toLowerCase().trim() ?? "";
    if (primaryOdysseyModel && primaryParsedName === resref) {
      odysseyModel = primaryOdysseyModel;
    } else if (primaryMdl && primaryMdx && primaryMdl.length && primaryMdx.length) {
      odysseyModel = new KotOR.OdysseyModel(new BinaryReader(primaryMdl), new BinaryReader(primaryMdx));
    } else {
      odysseyModel = await KotOR.MDLLoader.loader.load(resref);
    }
  } catch (e) {
    console.warn(`collectModelAssets: failed to load model '${resref}'`, e);
    return;
  }
  if (!odysseyModel) return;

  const assets: CollectedAssets = { models: new Set(), textures: new Set() };
  if (odysseyModel.rootNode) {
    collectNodeAssets(odysseyModel.rootNode, assets);
  }

  for (const tex of assets.textures) {
    allTextures.add(tex);
  }

  const superName = odysseyModel.modelHeader?.superModelName?.toLowerCase().trim();
  if (superName && superName.length && superName !== 'null') {
    assets.models.add(superName);
  }

  for (const childModel of assets.models) {
    await collectModelAssets(childModel, visited, allModels, allTextures);
  }
}

async function loadTxiForTexture(resref: string): Promise<TXI | undefined> {
  try {
    const result = await KotOR.TextureLoader.tpcLoader.findTPC(resref);
    if (result?.buffer?.length) {
      const tpc = new KotOR.TPCObject({ filename: resref, file: result.buffer, pack: result.pack || 0 });
      return tpc.txi;
    }
  } catch (e) { /* not a TPC */ }

  try {
    const txiBuffer = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['txi'], resref);
    if (txiBuffer?.length) {
      return new TXI(txiBuffer);
    }
  } catch (e) { /* no TXI */ }

  return undefined;
}

export async function collectTxiReferencedTextures(allTextures: Set<string>): Promise<void> {
  const processed = new Set<string>();
  let queue = [...allTextures];

  while (queue.length > 0) {
    const next: string[] = [];
    for (const resref of queue) {
      if (processed.has(resref)) continue;
      processed.add(resref);

      const txi = await loadTxiForTexture(resref);
      if (!txi) continue;

      if (txi.bumpMapTexture) {
        const name = String(txi.bumpMapTexture).toLowerCase().trim();
        if (name && name !== 'null' && !allTextures.has(name)) {
          allTextures.add(name);
          next.push(name);
        }
      }
      if (txi.envMapTexture) {
        const name = String(txi.envMapTexture).toLowerCase().trim();
        if (name && name !== 'null' && !allTextures.has(name)) {
          allTextures.add(name);
          next.push(name);
        }
      }
    }
    queue = next;
  }
}

export async function fetchTextureBuffer(resref: string): Promise<{ filename: string; buffer: Uint8Array; txi?: Uint8Array } | undefined> {
  try {
    const result = await KotOR.TextureLoader.tpcLoader.findTPC(resref);
    if (result?.buffer?.length) {
      return { filename: `${resref}.tpc`, buffer: result.buffer };
    }
  } catch (e) { /* TPC not found, try TGA */ }

  try {
    const buffer = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['tga'], resref);
    if (buffer?.length) {
      let txi: Uint8Array | undefined;
      try {
        txi = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['txi'], resref);
      } catch (e) { /* no TXI companion */ }
      return { filename: `${resref}.tga`, buffer, txi };
    }
  } catch (e) { /* TGA not found either */ }

  return undefined;
}

export async function fetchModelBuffers(resref: string): Promise<{ mdl: Uint8Array; mdx: Uint8Array } | undefined> {
  try {
    const [mdl, mdx] = await Promise.all([
      KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['mdl'], resref),
      KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['mdx'], resref),
    ]);
    if (mdl?.length && mdx?.length) {
      return { mdl, mdx };
    }
  } catch (e) {
    console.warn(`fetchModelBuffers: failed to fetch MDL/MDX for '${resref}'`, e);
  }

  return undefined;
}

export async function exportCollectedAssets(
  allModels: Set<string>,
  allTextures: Set<string>,
  target: ExportTarget,
  fetchModelBuffersOverride?: (resref: string) => Promise<{ mdl: Uint8Array; mdx: Uint8Array } | undefined>,
  onProgress?: ProgressCallback,
): Promise<{ exportedFiles: string[]; skippedFiles: string[]; failedFiles: string[] }> {
  const exportedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const failedFiles: string[] = [];

  const fetchMdl = fetchModelBuffersOverride || fetchModelBuffers;
  const progress = createThrottledProgress(onProgress);

  const totalItems = allModels.size + allTextures.size;
  let processed = 0;

  for (const resref of allModels) {
    processed++;
    progress(processed, totalItems, `Exporting model: ${resref}`);
    try {
      const mdlName = `${resref}.mdl`;
      const mdxName = `${resref}.mdx`;
      const mdlExists = await fileExists(mdlName, target);
      const mdxExists = await fileExists(mdxName, target);
      if (mdlExists && mdxExists) {
        skippedFiles.push(mdlName, mdxName);
        continue;
      }
      const buffers = await fetchMdl(resref);
      if (buffers) {
        if (!mdlExists) {
          await writeFile(mdlName, buffers.mdl, target);
          exportedFiles.push(mdlName);
        } else {
          skippedFiles.push(mdlName);
        }
        if (!mdxExists) {
          await writeFile(mdxName, buffers.mdx, target);
          exportedFiles.push(mdxName);
        } else {
          skippedFiles.push(mdxName);
        }
      } else {
        failedFiles.push(`${resref}.mdl/.mdx`);
      }
    } catch (e) {
      failedFiles.push(`${resref}.mdl/.mdx`);
      console.error(`exportCollectedAssets: error exporting model '${resref}'`, e);
    }
  }

  for (const resref of allTextures) {
    processed++;
    progress(processed, totalItems, `Exporting texture: ${resref}`);
    try {
      const result = await fetchTextureBuffer(resref);
      if (result) {
        if (await fileExists(result.filename, target)) {
          skippedFiles.push(result.filename);
        } else {
          await writeFile(result.filename, result.buffer, target);
          exportedFiles.push(result.filename);
        }
        if (result.txi?.length) {
          const txiName = `${resref}.txi`;
          if (await fileExists(txiName, target)) {
            skippedFiles.push(txiName);
          } else {
            await writeFile(txiName, result.txi, target);
            exportedFiles.push(txiName);
          }
        }
      } else {
        failedFiles.push(resref);
      }
    } catch (e) {
      failedFiles.push(resref);
      console.error(`exportCollectedAssets: error exporting texture '${resref}'`, e);
    }
  }

  progress.flush();
  return { exportedFiles, skippedFiles, failedFiles };
}

export function showExtractionResults(results: ExtractionResults, progressModal?: ModalExtractionProgressState): void {
  if (progressModal) {
    progressModal.close();
  }
  const modal = new ModalExtractionResultsState(results);
  modal.attachToModalManager(ForgeState.modalManager);
  modal.open();
}

export function createProgressModal(): ModalExtractionProgressState {
  const modal = new ModalExtractionProgressState();
  modal.attachToModalManager(ForgeState.modalManager);
  modal.open();
  return modal;
}
