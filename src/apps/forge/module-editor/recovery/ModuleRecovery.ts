/**
 * Autosave / recovery snapshots for the module editor.
 *
 * @file ModuleRecovery.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ProjectVFS } from "@/apps/forge/module-editor/vfs/ProjectVFS";

export interface ModuleRecoveryManifest {
  savedAt: number;
  reason: "autosave" | "crash" | "manual";
  files: string[];
}

const RECOVERY_DIR = ".forge/recovery";

export class ModuleRecovery {
  static async saveSnapshot(
    buffers: { ifo: Uint8Array; are: Uint8Array; git: Uint8Array; lyt?: Uint8Array; vis?: Uint8Array },
    reason: ModuleRecoveryManifest["reason"] = "autosave",
  ): Promise<boolean> {
    const vfs = ProjectVFS.shared;
    if (!vfs.hasRoot()) {
      return false;
    }
    await vfs.mkdir(RECOVERY_DIR);
    const files = [
      { path: `${RECOVERY_DIR}/module.ifo`, data: buffers.ifo },
      { path: `${RECOVERY_DIR}/area.are`, data: buffers.are },
      { path: `${RECOVERY_DIR}/area.git`, data: buffers.git },
    ];
    if (buffers.lyt) {
      files.push({ path: `${RECOVERY_DIR}/area.lyt`, data: buffers.lyt });
    }
    if (buffers.vis) {
      files.push({ path: `${RECOVERY_DIR}/area.vis`, data: buffers.vis });
    }
    const manifest: ModuleRecoveryManifest = {
      savedAt: Date.now(),
      reason,
      files: files.map((f) => f.path),
    };
    files.push({
      path: `${RECOVERY_DIR}/manifest.json`,
      data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    });
    return vfs.writeFilesAtomic(files);
  }

  static async hasRecovery(): Promise<boolean> {
    const vfs = ProjectVFS.shared;
    if (!vfs.hasRoot()) return false;
    return vfs.exists(`${RECOVERY_DIR}/manifest.json`);
  }

  static async readManifest(): Promise<ModuleRecoveryManifest | undefined> {
    const vfs = ProjectVFS.shared;
    if (!(await ModuleRecovery.hasRecovery())) {
      return undefined;
    }
    try {
      const bytes = await vfs.readFile(`${RECOVERY_DIR}/manifest.json`);
      return JSON.parse(new TextDecoder().decode(bytes)) as ModuleRecoveryManifest;
    } catch {
      return undefined;
    }
  }

  static async clear(): Promise<void> {
    const vfs = ProjectVFS.shared;
    if (!vfs.hasRoot()) return;
    const manifest = await ModuleRecovery.readManifest();
    if (!manifest) return;
    for (const file of manifest.files) {
      if (await vfs.exists(file)) {
        await vfs.unlink(file);
      }
    }
  }
}
