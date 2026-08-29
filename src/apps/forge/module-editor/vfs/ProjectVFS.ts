/**
 * ProjectFileSystem-backed VFS with atomic multi-file writes.
 *
 * @file ProjectVFS.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import * as KotOR from "@/apps/forge/KotOR";
import {
  IProjectVFS,
  ProjectVFSBackend,
  ProjectVFSCapabilities,
  ProjectVFSWriteRequest,
} from "@/apps/forge/module-editor/vfs/IProjectVFS";

function toUint8Array(data: Uint8Array | string): Uint8Array {
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  return data;
}

export class ProjectVFS implements IProjectVFS {
  static readonly shared = new ProjectVFS();

  capabilities(): ProjectVFSCapabilities {
    let backend: ProjectVFSBackend = "none";
    if (ProjectFileSystem.hasRoot()) {
      if (ProjectFileSystem.isVirtual) {
        backend = "virtual";
      } else if (ProjectFileSystem.useHandleBackend()) {
        backend = "fsa";
      } else {
        backend = "electron";
      }
    }
    const isBrowser = KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.BROWSER;
    return {
      backend,
      canWatch: backend === "electron",
      canAtomicWrite: backend === "electron" || backend === "virtual",
      canRevealInOs: backend === "electron",
      isBrowser,
    };
  }

  hasRoot(): boolean {
    return ProjectFileSystem.hasRoot();
  }

  async exists(path: string): Promise<boolean> {
    return ProjectFileSystem.exists(path);
  }

  async readFile(path: string): Promise<Uint8Array> {
    return ProjectFileSystem.readFile(path);
  }

  async writeFile(path: string, data: Uint8Array | string): Promise<boolean> {
    return ProjectFileSystem.writeFile(path, toUint8Array(data));
  }

  async writeFilesAtomic(files: ProjectVFSWriteRequest[]): Promise<boolean> {
    if (!files.length) {
      return true;
    }
    const caps = this.capabilities();
    if (caps.backend === "electron") {
      const temps: { temp: string; final: string; data: Uint8Array }[] = [];
      try {
        for (const file of files) {
          const temp = `${file.path}.__forge_tmp__`;
          const data = toUint8Array(file.data);
          const ok = await ProjectFileSystem.writeFile(temp, data);
          if (!ok) {
            throw new Error(`Failed to write temp file ${temp}`);
          }
          temps.push({ temp, final: file.path, data });
        }
        for (const entry of temps) {
          if (await ProjectFileSystem.exists(entry.final)) {
            await ProjectFileSystem.unlink(entry.final);
          }
          const renamed = await ProjectFileSystem.rename(entry.temp, entry.final);
          if (!renamed) {
            // Fallback: rewrite final path directly.
            await ProjectFileSystem.writeFile(entry.final, entry.data);
            if (await ProjectFileSystem.exists(entry.temp)) {
              await ProjectFileSystem.unlink(entry.temp);
            }
          }
        }
        return true;
      } catch (error) {
        console.error("ProjectVFS atomic write failed", error);
        for (const entry of temps) {
          try {
            if (await ProjectFileSystem.exists(entry.temp)) {
              await ProjectFileSystem.unlink(entry.temp);
            }
          } catch {
            // ignore cleanup errors
          }
        }
        return false;
      }
    }

    // FSA / virtual: sequential write with best-effort prior buffer backup.
    const backups: { path: string; data?: Uint8Array }[] = [];
    try {
      for (const file of files) {
        const prior = (await ProjectFileSystem.exists(file.path))
          ? await ProjectFileSystem.readFile(file.path)
          : undefined;
        backups.push({ path: file.path, data: prior });
        const ok = await ProjectFileSystem.writeFile(file.path, toUint8Array(file.data));
        if (!ok) {
          throw new Error(`Failed to write ${file.path}`);
        }
      }
      return true;
    } catch (error) {
      console.error("ProjectVFS multi-write failed; attempting rollback", error);
      for (let i = backups.length - 1; i >= 0; i--) {
        const backup = backups[i];
        try {
          if (backup.data) {
            await ProjectFileSystem.writeFile(backup.path, backup.data);
          } else if (await ProjectFileSystem.exists(backup.path)) {
            await ProjectFileSystem.unlink(backup.path);
          }
        } catch {
          // ignore rollback errors
        }
      }
      return false;
    }
  }

  async readdir(path: string): Promise<string[]> {
    return ProjectFileSystem.readdir(path);
  }

  async mkdir(path: string): Promise<boolean> {
    return ProjectFileSystem.mkdir(path);
  }

  async unlink(path: string): Promise<boolean> {
    return ProjectFileSystem.unlink(path);
  }

  async rename(from: string, to: string): Promise<boolean> {
    return ProjectFileSystem.rename(from, to);
  }
}
