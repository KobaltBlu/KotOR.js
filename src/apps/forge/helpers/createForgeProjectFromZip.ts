/**
 * Create / open a Forge project from a project ZIP archive.
 *
 * @file createForgeProjectFromZip.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { createForgeProject } from "@/apps/forge/helpers/createForgeProject";
import type { CreateForgeProjectOptions } from "@/apps/forge/helpers/projectCreateOptions";
import {
  inspectProjectZip,
  materializeProjectZip,
  type InspectProjectZipResult,
} from "@/apps/forge/helpers/projectZip";
import { Project } from "@/apps/forge/Project";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { DeepObject } from "@/utility/DeepObject";

export interface CreateForgeProjectFromZipOptions extends CreateForgeProjectOptions {
  buffer: Uint8Array;
  /** Optional override applied after materialize (name already used for virtual folder). */
  onProgress?: (current: number, total: number, filename: string) => void;
}

export interface CreateForgeProjectFromZipResult {
  ok: boolean;
  reason?: string;
  project?: Project;
  inspect?: InspectProjectZipResult;
  written?: number;
}

/**
 * Close any open project (with dirty confirm), create a destination root,
 * unpack the ZIP, and open the project.
 */
export async function createForgeProjectFromZip(
  options: CreateForgeProjectFromZipOptions,
): Promise<CreateForgeProjectFromZipResult> {
  const inspected = inspectProjectZip(options.buffer);
  if (!inspected.ok || !inspected.files || !inspected.settings) {
    return {
      ok: false,
      reason: inspected.reason || "Invalid Forge project ZIP.",
      inspect: inspected,
    };
  }

  if (ForgeState.project instanceof Project) {
    const closed = await ForgeState.project.close();
    if (!closed) {
      return { ok: false, reason: "Close the current project to continue.", inspect: inspected };
    }
  }

  const project = await createForgeProject(options);
  const materialized = await materializeProjectZip({
    files: inspected.files,
    writeFile: (rel, data) => ProjectFileSystem.writeFile(rel, data),
    mkdir: (rel, opts) => ProjectFileSystem.mkdir(rel, { recursive: !!opts?.recursive }),
    onProgress: options.onProgress,
  });
  if (!materialized.ok) {
    return {
      ok: false,
      reason: materialized.reason || "Failed to unpack project ZIP.",
      project,
      inspect: inspected,
      written: materialized.written,
    };
  }

  // Prefer user-chosen name/game from the wizard over archive settings when they differ.
  const name = String(options.name || "").trim() || inspected.settings.name;
  project.settings = DeepObject.Merge({}, inspected.settings, {
    name,
    game: options.game ?? inspected.settings.game,
  });
  // Clear open_files from the archive so we don't try to reopen missing handles on a fresh import.
  project.settings.open_files = [] as typeof project.settings.open_files;
  if (project.settings.module_editor) {
    project.settings.module_editor.open = false;
  }
  await project.saveSettings();
  await project.open();
  await ProjectFileSystem.initializeProjectExplorer();

  return {
    ok: true,
    project,
    inspect: inspected,
    written: materialized.written,
  };
}
