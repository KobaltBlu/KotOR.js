/**
 * Resolve a project-relative path for tabs opened from the project folder / OPFS.
 *
 * @file editorFileProjectPath.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface ProjectSaveFileLike {
  useProjectFileSystem?: boolean;
  path?: string;
  archive_path?: string;
  archive_path2?: string;
}

export function normalizeProjectRel(rel: string): string {
  return String(rel || "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function stripVirtualRoot(rawPath: string, host: "project.dir" | "game.dir"): string | undefined {
  const raw = String(rawPath || "").trim().replace(/\\/g, "/");
  if (!raw.length) {
    return undefined;
  }
  const hostRe = host === "project.dir" ? /^project\.dir\/?/i : /^game\.dir\/?/i;
  const stripped = raw
    .replace(/^file:\/\//i, "")
    .replace(/^\/+/, "")
    .replace(hostRe, "")
    .replace(/^\/+/, "");
  return stripped.length ? stripped : undefined;
}

export function editorFileProjectRelativePath(file: ProjectSaveFileLike | undefined): string | undefined {
  if (!file?.useProjectFileSystem) {
    return undefined;
  }
  if (file.archive_path || file.archive_path2) {
    return undefined;
  }
  return stripVirtualRoot(String(file.path || ""), "project.dir");
}

export interface GameSaveFileLike {
  useGameFileSystem?: boolean;
  path?: string;
  archive_path?: string;
  archive_path2?: string;
}

export function editorFileGameRelativePath(file: GameSaveFileLike | undefined): string | undefined {
  if (!file?.useGameFileSystem) {
    return undefined;
  }
  if (file.archive_path || file.archive_path2) {
    return undefined;
  }
  return stripVirtualRoot(String(file.path || ""), "game.dir");
}

/**
 * After renaming `fromRel` to `toRel` in the project tree, return the new
 * project-relative path for an open file (exact match or child of a renamed folder).
 */
export function remapProjectRelativeAfterRename(
  currentRel: string,
  fromRel: string,
  toRel: string,
): string | undefined {
  const current = normalizeProjectRel(currentRel);
  const from = normalizeProjectRel(fromRel);
  const to = normalizeProjectRel(toRel);
  if (!current.length || !from.length || !to.length) {
    return undefined;
  }
  const currentLower = current.toLowerCase();
  const fromLower = from.toLowerCase();
  if (currentLower === fromLower) {
    return to;
  }
  if (currentLower.startsWith(fromLower + "/")) {
    return to + current.slice(from.length);
  }
  return undefined;
}
