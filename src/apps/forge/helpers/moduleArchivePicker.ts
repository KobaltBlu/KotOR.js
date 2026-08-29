/**
 * Shared helpers for picking module archives in Forge modals.
 *
 * @file moduleArchivePicker.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ForgeFileSystemResponse, ForgeFileSystemResponseType } from "@/apps/forge/ForgeFileSystem";

export const MODULE_ARCHIVE_EXTS = ["mod", "rim", "erf"];

export interface PickedModuleArchive {
  buffer: Uint8Array;
  name: string;
  path?: string;
}

export async function readPickedModuleArchive(
  response: ForgeFileSystemResponse,
): Promise<PickedModuleArchive | undefined> {
  if (response.type === ForgeFileSystemResponseType.FILE_PATH_STRING) {
    const filePath = response.paths?.[0];
    if (!filePath) {
      return undefined;
    }
    const fs = await import("fs");
    const path = await import("path");
    const buf = await fs.promises.readFile(filePath);
    return { buffer: new Uint8Array(buf), name: path.basename(filePath), path: filePath };
  }
  const handle = response.handles?.[0] as FileSystemFileHandle | undefined;
  if (!handle || (handle as FileSystemHandle).kind === "directory") {
    return undefined;
  }
  const file = await handle.getFile();
  return {
    buffer: new Uint8Array(await file.arrayBuffer()),
    name: handle.name,
  };
}
