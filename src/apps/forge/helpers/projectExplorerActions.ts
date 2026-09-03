/**
 * Project explorer tree helpers: target folders, names, and clipboard paths.
 *
 * @file projectExplorerActions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";

const INVALID_ENTRY_CHARS = /[\\/:*?"<>|]/;

function normalizeRel(relPath: string): string {
  return relPath
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");
}

export function isExplorerRootNode(node: FileBrowserNode): boolean {
  return node.type === "group" && !!node.data?.explorerRoot;
}

export function explorerNodeRelPath(node: FileBrowserNode): string {
  return normalizeRel(String(node.data?.relPath ?? ""));
}

export function explorerTargetDir(node: FileBrowserNode): string {
  if (node.type === "group") {
    return explorerNodeRelPath(node);
  }
  const rel = explorerNodeRelPath(node);
  const idx = rel.lastIndexOf("/");
  return idx >= 0 ? rel.slice(0, idx) : "";
}

export function isProtectedExplorerPath(relPath: string): boolean {
  return normalizeRel(relPath) === ".forge";
}

export function joinProjectRel(dir: string, name: string): string {
  const base = normalizeRel(dir);
  const leaf = String(name || "").trim();
  if (!base.length) {
    return leaf;
  }
  return `${base}/${leaf}`;
}

export function sanitizeProjectEntryName(name: string): string | undefined {
  const trimmed = String(name || "").trim();
  if (!trimmed.length || trimmed === "." || trimmed === "..") {
    return undefined;
  }
  if (INVALID_ENTRY_CHARS.test(trimmed) || trimmed.includes("\0")) {
    return undefined;
  }
  if (trimmed.length > 255) {
    return undefined;
  }
  return trimmed;
}

export function explorerCopyRelativePath(node: FileBrowserNode): string {
  return explorerNodeRelPath(node);
}

export function explorerCopyPath(node: FileBrowserNode, rootDirectoryPath?: string): string {
  const rel = explorerNodeRelPath(node);
  if (typeof rootDirectoryPath === "string" && rootDirectoryPath.length) {
    const root = rootDirectoryPath.replace(/\\/g, "/");
    return rel ? `${root}/${rel}` : root;
  }
  return rel.length
    ? `${EditorFileProtocol.FILE}//project.dir/${rel}`
    : `${EditorFileProtocol.FILE}//project.dir`;
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
}
