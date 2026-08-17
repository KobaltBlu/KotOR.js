/**
 * Virtual Forge project folders: Origin Private File System, with an in-memory fallback.
 *
 * @file VirtualProjectFolder.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { MemoryDirectoryHandle } from "@/apps/forge/virtual/MemoryDirectoryHandle";

export const OPFS_VIRTUAL_PROJECTS_DIR = "forge-virtual-projects";
export const DEFAULT_VIRTUAL_PROJECT_NAME = "untitled-project";
export const FORGE_VIRTUAL_BACKEND_KEY = "__forgeVirtualBackend";

export type VirtualFolderBackend = "opfs" | "memory";

export interface VirtualProjectFolderResult {
  handle: FileSystemDirectoryHandle;
  name: string;
  backend: VirtualFolderBackend;
}

export function sanitizeVirtualProjectName(name: string): string {
  let sanitized = String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (sanitized === "." || sanitized === "..") {
    sanitized = "";
  }
  if (sanitized.startsWith(".")) {
    sanitized = sanitized.replace(/^\.+/, "");
  }
  if (!sanitized.length) {
    sanitized = DEFAULT_VIRTUAL_PROJECT_NAME;
  }
  if (sanitized.length > 64) {
    sanitized = sanitized.slice(0, 64).trim() || DEFAULT_VIRTUAL_PROJECT_NAME;
  }
  return sanitized;
}

export function isOriginPrivateFileSystemAvailable(): boolean {
  return typeof navigator !== "undefined"
    && !!navigator.storage
    && typeof navigator.storage.getDirectory === "function";
}

export function isMemoryDirectoryHandle(value: unknown): value is MemoryDirectoryHandle {
  return value instanceof MemoryDirectoryHandle;
}

export function isProjectDirectoryHandle(value: unknown): value is FileSystemDirectoryHandle {
  if (!value || typeof value !== "object") {
    return false;
  }
  const handle = value as { kind?: string; getDirectoryHandle?: unknown; name?: unknown };
  return handle.kind === "directory" && typeof handle.getDirectoryHandle === "function" && typeof handle.name === "string";
}

export function isPersistableDirectoryHandle(value: unknown): boolean {
  if (isMemoryDirectoryHandle(value)) {
    return false;
  }
  return typeof FileSystemDirectoryHandle !== "undefined" && value instanceof FileSystemDirectoryHandle;
}

export function hasProjectRoot(rootDirectoryPath?: string, rootDirectoryHandle?: unknown): boolean {
  return (typeof rootDirectoryPath === "string" && rootDirectoryPath.length > 0)
    || isProjectDirectoryHandle(rootDirectoryHandle);
}

export function getVirtualFolderBackend(handle: unknown): VirtualFolderBackend | undefined {
  if (isMemoryDirectoryHandle(handle)) {
    return "memory";
  }
  if (!handle || typeof handle !== "object") {
    return undefined;
  }
  const tagged = (handle as { [FORGE_VIRTUAL_BACKEND_KEY]?: VirtualFolderBackend })[FORGE_VIRTUAL_BACKEND_KEY];
  return tagged === "opfs" || tagged === "memory" ? tagged : undefined;
}

export function markVirtualFolderHandle(
  handle: FileSystemDirectoryHandle | MemoryDirectoryHandle,
  backend: VirtualFolderBackend
): FileSystemDirectoryHandle {
  (handle as unknown as { [FORGE_VIRTUAL_BACKEND_KEY]: VirtualFolderBackend })[FORGE_VIRTUAL_BACKEND_KEY] = backend;
  return handle as FileSystemDirectoryHandle;
}

export function createMemoryVirtualProjectFolder(name: string): VirtualProjectFolderResult {
  const sanitized = sanitizeVirtualProjectName(name);
  const handle = markVirtualFolderHandle(new MemoryDirectoryHandle(sanitized), "memory");
  return { handle, name: sanitized, backend: "memory" };
}

async function createOrOpenOpfsVirtualProjectFolder(name: string): Promise<VirtualProjectFolderResult> {
  const sanitized = sanitizeVirtualProjectName(name);
  const root = await navigator.storage.getDirectory();
  const projects = await root.getDirectoryHandle(OPFS_VIRTUAL_PROJECTS_DIR, { create: true });
  const handle = await projects.getDirectoryHandle(sanitized, { create: true });
  return {
    handle: markVirtualFolderHandle(handle, "opfs"),
    name: sanitized,
    backend: "opfs",
  };
}

export async function createOrOpenVirtualProjectFolder(name: string): Promise<VirtualProjectFolderResult> {
  if (isOriginPrivateFileSystemAvailable()) {
    try {
      return await createOrOpenOpfsVirtualProjectFolder(name);
    } catch (e) {
      console.warn("VirtualProjectFolder: OPFS unavailable, using in-memory folder", e);
    }
  }
  return createMemoryVirtualProjectFolder(name);
}
