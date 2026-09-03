/**
 * Unified project virtual filesystem contract.
 *
 * @file IProjectVFS.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type ProjectVFSBackend = "fsa" | "electron" | "virtual" | "none";

export interface ProjectVFSCapabilities {
  backend: ProjectVFSBackend;
  canWatch: boolean;
  canAtomicWrite: boolean;
  canRevealInOs: boolean;
  isBrowser: boolean;
}

export interface ProjectVFSWriteRequest {
  path: string;
  data: Uint8Array | string;
}

export interface IProjectVFS {
  capabilities(): ProjectVFSCapabilities;
  hasRoot(): boolean;
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array | string): Promise<boolean>;
  /**
   * Write multiple project-relative files. Best-effort atomic on Electron
   * (temp + rename); sequential with rollback attempt on FSA/virtual.
   */
  writeFilesAtomic(files: ProjectVFSWriteRequest[]): Promise<boolean>;
  readdir(path: string): Promise<string[]>;
  mkdir(path: string): Promise<boolean>;
  unlink(path: string): Promise<boolean>;
  rename(from: string, to: string): Promise<boolean>;
}
