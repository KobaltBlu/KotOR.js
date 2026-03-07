/**
 * Save a single resource to override folder (or any directory).
 * Ported from PyKotor Holocron Toolset save-to-override / extract behavior.
 * Used when saving a resource as a standalone file (e.g. override/module_name/resref.ext).
 */

import { ResourceTypes } from "../../../resource/ResourceTypes";

export interface SaveToOverrideOptions {
  resref: string;
  resType: number;
  data: Uint8Array;
  /** Directory path (Electron). Used when outputDirHandle is not provided. */
  outputDir?: string;
  /** Directory handle (browser File System Access API). Used when outputDir is not available. */
  outputDirHandle?: FileSystemDirectoryHandle;
  /** Optional extension override (default: from ResourceTypes) */
  ext?: string;
}

/**
 * Writes a single resource to a file in the given directory.
 * File name: resref.ext (e.g. my_script.nss).
 * Uses fs in Electron; uses File System Access API when outputDirHandle is provided.
 */
export async function saveResourceToOverride(options: SaveToOverrideOptions): Promise<string> {
  const { resref, resType, data, outputDir, outputDirHandle, ext } = options;
  const extension = ext ?? ResourceTypes.getKeyByValue(resType) ?? "res";
  const fileName = `${resref}.${extension}`;

  const useFs = outputDir && typeof process !== "undefined" && process.versions?.node != null;
  const useHandle = outputDirHandle && typeof outputDirHandle.getFileHandle === "function";

  if (!useFs && !useHandle) {
    throw new Error(
      "Save to Override requires Electron (outputDir) or browser with File System Access (outputDirHandle)."
    );
  }

  if (useFs) {
    const fs =
      (typeof require !== "undefined" && require("fs")) ||
      (typeof window !== "undefined" && (window as Window & { require?: (id: string) => unknown }).require?.("fs"));
    if (!fs?.promises?.writeFile) throw new Error("File system write not available.");
    const pathMod = typeof require !== "undefined" && require("path") ? require("path") : null;
    const fullPath = pathMod ? pathMod.join(outputDir!, fileName) : `${outputDir}/${fileName}`;
    if (fs.promises.mkdir) await fs.promises.mkdir(outputDir!, { recursive: true });
    await fs.promises.writeFile(fullPath, Buffer.from(data));
    return fullPath;
  }

  const handle = await outputDirHandle!.getFileHandle(fileName, { create: true });
  const writable = await (handle as FileSystemFileHandle).createWritable();
  await writable.write(data as FileSystemWriteChunkType);
  await writable.close();
  return `${outputDirHandle!.name}/${fileName}`;
}
