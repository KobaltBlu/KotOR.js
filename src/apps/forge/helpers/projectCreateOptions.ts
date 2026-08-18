/**
 * New-project form options and default settings (no module files).
 *
 * @file projectCreateOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ProjectType } from "@/apps/forge/enum/ProjectType";
import { ProjectSettings } from "@/apps/forge/interfaces/ProjectSettings";
import { GameEngineType } from "@/enums/engine/GameEngineType";

export type ProjectStorageMode = "virtual" | "local";

export interface CreateForgeProjectDirectory {
  path?: string;
  handle?: FileSystemDirectoryHandle;
}

export interface CreateForgeProjectOptions {
  name: string;
  game: GameEngineType;
  storage: ProjectStorageMode;
  directory?: CreateForgeProjectDirectory;
}

export function canCreateForgeProject(options: CreateForgeProjectOptions): boolean {
  if (!String(options.name || "").trim()) {
    return false;
  }
  if (options.storage === "local") {
    return !!(options.directory?.path || options.directory?.handle);
  }
  return true;
}

export function resolveProjectGame(game?: GameEngineType | string): GameEngineType {
  const raw = String(game || "").toUpperCase();
  if (raw === GameEngineType.TSL || raw === "TSL") {
    return GameEngineType.TSL;
  }
  return GameEngineType.KOTOR;
}

export function newProjectSettings(name: string, game?: GameEngineType | string): ProjectSettings {
  return {
    name: String(name || "").trim(),
    game: resolveProjectGame(game),
    type: ProjectType.OTHER,
    module_editor: { open: false },
    open_files: [],
  };
}
