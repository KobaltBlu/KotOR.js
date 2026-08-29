/**
 * Create a Forge project and unpack a module archive into it.
 *
 * @file createForgeProjectFromModule.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ProjectType } from "@/apps/forge/enum/ProjectType";
import { createForgeProject } from "@/apps/forge/helpers/createForgeProject";
import type { CreateForgeProjectOptions } from "@/apps/forge/helpers/projectCreateOptions";
import {
  importModuleArchive,
  type ImportModuleArchiveResult,
} from "@/apps/forge/helpers/importModuleArchive";
import { Project } from "@/apps/forge/Project";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";

export interface CreateForgeProjectFromModuleOptions extends CreateForgeProjectOptions {
  buffer: Uint8Array;
  filename: string;
  companionBuffer?: Uint8Array;
  includeCompanion?: boolean;
  openEditor?: boolean;
  onProgress?: (current: number, total: number, filename: string) => void;
}

export interface CreateForgeProjectFromModuleResult {
  ok: boolean;
  reason?: string;
  project?: Project;
  import?: ImportModuleArchiveResult;
  /** Layout/VIS warnings from unpack (also on `import.warnings`). */
  warnings?: string[];
}

/** Suggest a project name from an archive filename (e.g. m19aa.mod → m19aa). */
export function projectNameFromModuleArchive(filename: string): string {
  const normalized = String(filename || "").replace(/\\/g, "/");
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base).trim();
  return stem.length ? stem : "Untitled Module";
}

/**
 * Create project settings/folder, unpack the archive, open the project, optionally open the module editor.
 */
export async function createForgeProjectFromModule(
  options: CreateForgeProjectFromModuleOptions,
): Promise<CreateForgeProjectFromModuleResult> {
  const project = await createForgeProject(options);
  const imported = await importModuleArchive({
    buffer: options.buffer,
    filename: options.filename,
    companionBuffer: options.companionBuffer,
    includeCompanion: options.includeCompanion,
    overwriteExisting: true,
    onProgress: options.onProgress,
  });
  if (!imported.ok) {
    return {
      ok: false,
      reason: imported.reason || "Failed to unpack module archive.",
      project,
      import: imported,
      warnings: imported.warnings || [],
    };
  }

  project.settings.type = ProjectType.MODULE;
  await project.saveSettings();
  await project.open();
  await ProjectFileSystem.initializeProjectExplorer();

  if (options.openEditor !== false && project.hasModule()) {
    try {
      await project.initEditor();
    } catch (e) {
      console.error("createForgeProjectFromModule: failed to open module editor", e);
    }
  }

  return {
    ok: true,
    project,
    import: imported,
    warnings: imported.warnings || [],
  };
}
