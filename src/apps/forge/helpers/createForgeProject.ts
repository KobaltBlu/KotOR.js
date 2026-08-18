/**
 * Create a Forge project folder and settings without module files.
 *
 * @file createForgeProject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { Project } from "@/apps/forge/Project";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import {
  canCreateForgeProject,
  newProjectSettings,
  resolveProjectGame,
  type CreateForgeProjectOptions,
} from "@/apps/forge/helpers/projectCreateOptions";
import { createOrOpenVirtualProjectFolder } from "@/apps/forge/virtual/VirtualProjectFolder";

export {
  canCreateForgeProject,
  newProjectSettings,
  resolveProjectGame,
} from "@/apps/forge/helpers/projectCreateOptions";
export type {
  CreateForgeProjectDirectory,
  CreateForgeProjectOptions,
  ProjectStorageMode,
} from "@/apps/forge/helpers/projectCreateOptions";

/**
 * Attach the project filesystem and write `.forge/settings.json`.
 * Does not open the project (no game Init / explorer).
 */
export async function createForgeProject(options: CreateForgeProjectOptions): Promise<Project> {
  const name = String(options.name || "").trim();
  if (!canCreateForgeProject({ ...options, name })) {
    throw new Error("Project name and storage location are required");
  }

  ProjectFileSystem.clearDirectoryCache();
  if (options.storage === "virtual") {
    const folder = await createOrOpenVirtualProjectFolder(name);
    ProjectFileSystem.rootDirectoryHandle = folder.handle;
    ProjectFileSystem.rootDirectoryPath = undefined as unknown as string;
    ProjectFileSystem.isVirtual = true;
  } else if (options.directory?.handle) {
    ProjectFileSystem.rootDirectoryHandle = options.directory.handle;
    ProjectFileSystem.rootDirectoryPath = undefined as unknown as string;
    ProjectFileSystem.isVirtual = false;
  } else if (options.directory?.path) {
    ProjectFileSystem.rootDirectoryPath = options.directory.path;
    ProjectFileSystem.rootDirectoryHandle = undefined as unknown as FileSystemDirectoryHandle;
    ProjectFileSystem.isVirtual = false;
  } else {
    throw new Error("Project directory path or handle is required");
  }

  const project = new Project();
  project.settings = newProjectSettings(name, resolveProjectGame(options.game));
  await project.saveSettings();
  return project;
}
