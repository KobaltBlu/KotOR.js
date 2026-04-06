import * as KotOR from "@/apps/forge/KotOR";
import * as fs from "fs";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { TXI } from "@/resource/TXI";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ModalExtractionResultsState, ExtractionResults } from "@/apps/forge/states/modal/ModalExtractionResultsState";
import { ModalExtractionProgressState } from "@/apps/forge/states/modal/ModalExtractionProgressState";

declare const dialog: any;

export type ExportTarget =
  | { type: 'electron'; path: string }
  | { type: 'browser'; handle: FileSystemDirectoryHandle };

interface CollectedAssets {
  models: Set<string>;
  textures: Set<string>;
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
      await target.handle.getFileHandle(filename);
      return true;
    } catch {
      return false;
    }
  }
}

export async function writeFile(filename: string, buffer: Uint8Array, target: ExportTarget): Promise<void> {
  if (target.type === 'electron') {
    await new Promise<void>((resolve, reject) => {
      fs.writeFile(`${target.path}/${filename}`, buffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } else {
    const fileHandle = await target.handle.getFileHandle(filename, { create: true });
    const ws: FileSystemWritableFileStream = await fileHandle.createWritable();
    await ws.write(buffer as any);
    await ws.close();
  }
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
): Promise<void> {
  resref = resref.toLowerCase().trim();
  if (!resref || visited.has(resref)) return;
  visited.add(resref);
  allModels.add(resref);

  let odysseyModel: KotOR.OdysseyModel | undefined;
  try {
    if (primaryMdl && primaryMdx) {
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

export type ProgressCallback = (current: number, total: number, message: string) => void;

/**
 * Export all collected models and textures to the target directory, skipping
 * files that already exist. Returns the results for display.
 */
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

  const totalItems = allModels.size + allTextures.size;
  let processed = 0;

  for (const resref of allModels) {
    processed++;
    onProgress?.(processed, totalItems, `Exporting model: ${resref}`);
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
    onProgress?.(processed, totalItems, `Exporting texture: ${resref}`);
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
