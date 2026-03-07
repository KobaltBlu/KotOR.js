/**
 * ExtractErfToFolder – export all top-level resources from an ERF/MOD to a directory.
 * Used by File > Extract to folder when an ERF tab is active.
 * Electron only (uses path and fs).
 */

import type { ERFObject } from "../../../resource/ERFObject";
import type { IERFKeyEntry } from "../../../interface/resource/IERFKeyEntry";
import { ResourceTypes } from "../../../resource/ResourceTypes";
import type { ExtractOptions } from "../data/ExtractOptions";

export interface ExtractErfToFolderOptions {
  erf: ERFObject;
  /** Directory path (Electron). Required when outputDirHandle is not provided. */
  outputPath?: string;
  /** Directory handle (browser File System Access API). Used when outputPath not available. */
  outputDirHandle?: FileSystemDirectoryHandle;
  /** Optional: only extract these resource types (resType numbers). If empty, extract all. */
  filterTypes?: number[];
  /** Optional: TPC/MDL decompile etc. When set, extract logic may decompile textures/models (future). */
  extractOptions?: ExtractOptions;
}

/**
 * Extract all top-level resources from an ERF to a folder.
 * In Electron uses outputPath as filesystem path; in browser would need directory handle (not implemented here).
 */
export async function extractErfToFolder(options: ExtractErfToFolderOptions): Promise<{ count: number; errors: string[] }> {
  const { erf, outputPath, outputDirHandle, filterTypes, extractOptions: _extractOptions } = options;
  // extractOptions (TPC/MDL decompile) reserved for future use
  const keyList = erf.keyList;
  if (!keyList || !keyList.length) {
    return { count: 0, errors: [] };
  }

  const errors: string[] = [];
  let count = 0;

  const useFs = outputPath && typeof process !== "undefined" && process.versions?.node != null;
  const useHandle = outputDirHandle && typeof outputDirHandle.getFileHandle === "function";

  if (!useFs && !useHandle) {
    throw new Error(
      "Extract to folder requires Electron (outputPath) or browser with File System Access (outputDirHandle)."
    );
  }

  if (useFs && outputPath) {
    const fsMod = await import("fs");
    await fsMod.promises.mkdir(outputPath, { recursive: true });
  }

  for (const key of keyList) {
    if (filterTypes?.length && !filterTypes.includes(key.resType)) continue;
    const ext = ResourceTypes.getKeyByValue?.(key.resType) ?? '';
    const filename = ext ? `${key.resRef}.${ext}` : `${key.resRef}.res`;
    try {
      const buffer = await erf.getResourceBufferByResRef(key.resRef, key.resType);
      if (!buffer || buffer.length === 0) continue;

      if (useFs) {
        const pathMod = await import("path");
        const fsMod = await import("fs");
        const filePath = pathMod.join(outputPath!, filename);
        await fsMod.promises.writeFile(filePath, Buffer.from(buffer));
      } else if (useHandle) {
        const handle = await outputDirHandle!.getFileHandle(filename, { create: true });
        const writable = await (handle as FileSystemFileHandle).createWritable();
        await writable.write(new Blob([buffer as BlobPart]));
        await writable.close();
      }
      count++;
    } catch (e: unknown) {
      errors.push(`${filename}: ${e instanceof Error ? e.message : "Failed"}`);
    }
  }

  return { count, errors };
}
