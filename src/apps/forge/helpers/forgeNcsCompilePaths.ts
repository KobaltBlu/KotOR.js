import * as path from "path";

export const COMPILED_DIR = "ncs";
export const GAME_OVERRIDE_DIR = "Override";

/** Normalize project-relative paths to POSIX-style slashes. */
export function normalizeProjectRelativePath(projectRelPath: string): string {
  return projectRelPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Compiled NCS for game resources that have no sibling folder (KEY/BIF, RIM, ERF). */
export function compiledNcsOverrideRelativePath(resref: string | undefined | null): string {
  const leaf = String(resref ?? "untitled").replace(/\\/g, "/").split("/").pop() || "untitled";
  const base = leaf.replace(/\.(ncs|nss)$/i, "") || "untitled";
  return `${GAME_OVERRIDE_DIR}/${base}.ncs`;
}

/** Destination under project root: `{COMPILED_DIR}/<mirror>.ncs`. */
export function compiledNcsPathForProjectNss(projectRelNss: string): string {
  const norm = normalizeProjectRelativePath(projectRelNss);
  const dir = path.posix.dirname(norm);
  const baseNoExt = path.posix.basename(norm, ".nss");
  const leaf = `${baseNoExt}.ncs`;
  if (dir === "." || dir === "") return path.posix.join(COMPILED_DIR, leaf);
  return path.posix.join(COMPILED_DIR, dir, leaf);
}
