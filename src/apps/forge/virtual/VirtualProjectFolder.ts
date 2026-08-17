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

export interface ListedVirtualProjectFolder {
  name: string;
  handle?: FileSystemDirectoryHandle;
}

interface DirectoryListingHandle {
  values: () => AsyncIterable<{ kind: string; name: string }>;
}

function virtualProjectFolderKey(name: string): string {
  return name.toLowerCase();
}

/**
 * Merge OPFS-stored virtual folders with in-session virtual recents (by name).
 * Recents without a live handle are omitted unless they already exist in storage.
 */
export function mergeVirtualProjectFolderEntries(
  stored: ListedVirtualProjectFolder[],
  recents: Array<{ name?: string; virtual?: boolean; handle?: unknown }> = [],
): ListedVirtualProjectFolder[] {
  const byKey = new Map<string, ListedVirtualProjectFolder>();

  const put = (name: string, handle?: unknown) => {
    const trimmed = String(name || "").trim();
    if (!trimmed.length) {
      return;
    }
    const key = virtualProjectFolderKey(trimmed);
    const nextHandle = isProjectDirectoryHandle(handle) ? handle : undefined;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { name: trimmed, handle: nextHandle });
      return;
    }
    if (!existing.handle && nextHandle) {
      existing.handle = nextHandle;
    }
  };

  for (let i = 0; i < stored.length; i++) {
    put(stored[i].name, stored[i].handle);
  }

  for (let i = 0; i < recents.length; i++) {
    const recent = recents[i];
    if (!recent?.virtual) {
      continue;
    }
    const name = recent.name || (isProjectDirectoryHandle(recent.handle) ? recent.handle.name : "");
    const key = virtualProjectFolderKey(String(name || "").trim());
    if (!key.length) {
      continue;
    }
    if (byKey.has(key) || isProjectDirectoryHandle(recent.handle)) {
      put(name, recent.handle);
    }
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
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

export async function collectVirtualProjectFoldersFromDirectory(
  projectsDir: DirectoryListingHandle,
): Promise<ListedVirtualProjectFolder[]> {
  const out: ListedVirtualProjectFolder[] = [];
  for await (const entry of projectsDir.values()) {
    if (entry.kind !== "directory" || !String(entry.name || "").trim()) {
      continue;
    }
    const handle = isProjectDirectoryHandle(entry) ? entry : undefined;
    if (handle && !getVirtualFolderBackend(handle)) {
      markVirtualFolderHandle(
        handle,
        isMemoryDirectoryHandle(handle) ? "memory" : "opfs",
      );
    }
    out.push({ name: entry.name, handle });
  }
  return mergeVirtualProjectFolderEntries(out, []);
}

export async function listStoredVirtualProjectFolders(): Promise<ListedVirtualProjectFolder[]> {
  if (!isOriginPrivateFileSystemAvailable()) {
    return [];
  }
  try {
    const root = await navigator.storage.getDirectory();
    const projects = await root.getDirectoryHandle(OPFS_VIRTUAL_PROJECTS_DIR, { create: false });
    return await collectVirtualProjectFoldersFromDirectory(projects);
  } catch (e) {
    console.warn("VirtualProjectFolder: could not list stored folders", e);
    return [];
  }
}

export async function loadVirtualProjectFoldersForRestore(
  recents: Array<{ name?: string; virtual?: boolean; handle?: unknown }> = [],
): Promise<ListedVirtualProjectFolder[]> {
  const stored = await listStoredVirtualProjectFolders();
  return mergeVirtualProjectFolderEntries(stored, recents);
}
