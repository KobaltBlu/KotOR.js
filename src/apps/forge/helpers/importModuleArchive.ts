/**
 * Inspect and flatten a module .rim / .erf / .mod into a Forge project folder.
 *
 * @file importModuleArchive.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ERFObject } from "@/resource/ERFObject";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { RIMObject } from "@/resource/RIMObject";

export type ModuleArchiveKind = "rim" | "erf" | "mod";

export interface ModuleArchiveEntry {
  resRef: string;
  resType: number;
  filename: string;
  data: Uint8Array;
}

export interface ModuleArchivePreview {
  kind: ModuleArchiveKind;
  filename: string;
  resourceCount: number;
  hasModuleIfo: boolean;
  entryArea?: string;
  isCompanionRim: boolean;
  companionFilename?: string;
}

export interface ImportModuleArchiveOptions {
  buffer: Uint8Array;
  filename: string;
  companionBuffer?: Uint8Array;
  includeCompanion?: boolean;
  overwriteExisting?: boolean;
  exists?: (path: string) => Promise<boolean>;
  writeFile?: (path: string, data: Uint8Array) => Promise<boolean>;
  onProgress?: (current: number, total: number, filename: string) => void;
}

export interface ImportModuleArchiveResult {
  ok: boolean;
  reason?: string;
  needsOverwrite?: boolean;
  written: string[];
  entryArea?: string;
  hasModuleIfo: boolean;
}

const IFO_TYPE = ResourceTypes.ifo;

function archiveMagic(buffer: Uint8Array): string {
  if (!buffer || buffer.byteLength < 4) {
    return "";
  }
  return String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
}

export function archiveKindFromFilename(filename: string): ModuleArchiveKind {
  const ext = String(filename || "").split(".").pop()?.toLowerCase();
  if (ext === "rim") {
    return "rim";
  }
  if (ext === "mod") {
    return "mod";
  }
  return "erf";
}

export function isCompanionRimFilename(filename: string): boolean {
  const base = basenameNoDir(filename);
  const name = stripExtension(base).toLowerCase();
  const ext = extensionOf(base).toLowerCase();
  return ext === "rim" && name.endsWith("_s");
}

export function companionRimFilename(filename: string): string | undefined {
  const base = basenameNoDir(filename);
  const name = stripExtension(base);
  const ext = extensionOf(base).toLowerCase();
  if (ext !== "rim") {
    return undefined;
  }
  if (name.toLowerCase().endsWith("_s")) {
    return undefined;
  }
  return `${name}_s.rim`;
}

function basenameNoDir(filename: string): string {
  const normalized = String(filename || "").replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx > 0 ? filename.slice(0, idx) : filename;
}

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx > 0 ? filename.slice(idx + 1) : "";
}

function sliceResource(buffer: Uint8Array, offset: number, size: number): Uint8Array {
  const start = Math.max(0, offset | 0);
  const end = Math.min(buffer.byteLength, start + Math.max(0, size | 0));
  return buffer.slice(start, end);
}

function resourceFilename(resRef: string, resType: number): string | undefined {
  const ext = ResourceTypes.getKeyByValue(resType);
  if (typeof ext !== "string" || !ext.length) {
    return undefined;
  }
  const ref = String(resRef || "").trim().toLowerCase();
  if (!ref.length) {
    return undefined;
  }
  return `${ref}.${ext}`;
}

export async function loadModuleArchiveEntries(buffer: Uint8Array): Promise<ModuleArchiveEntry[]> {
  const bytes = buffer.slice();
  const magic = archiveMagic(bytes);
  if (magic === "RIM ") {
    const rim = new RIMObject(bytes);
    await rim.load();
    const out: ModuleArchiveEntry[] = [];
    for (let i = 0; i < rim.resources.length; i++) {
      const res = rim.resources[i];
      const filename = resourceFilename(res.resRef, res.resType);
      if (!filename) {
        continue;
      }
      out.push({
        resRef: res.resRef,
        resType: res.resType,
        filename,
        data: sliceResource(bytes, res.offset, res.size),
      });
    }
    return out;
  }
  const erf = new ERFObject(bytes);
  await erf.load();
  const out: ModuleArchiveEntry[] = [];
  for (let i = 0; i < erf.keyList.length; i++) {
    const key = erf.keyList[i];
    const res = erf.resources[key.resId];
    if (!res) {
      continue;
    }
    const filename = resourceFilename(key.resRef, key.resType);
    if (!filename) {
      continue;
    }
    const data = res.data instanceof Uint8Array && res.data.byteLength
      ? res.data.slice()
      : sliceResource(bytes, res.offset, res.size);
    out.push({
      resRef: key.resRef,
      resType: key.resType,
      filename,
      data,
    });
  }
  return out;
}

function findModuleIfo(entries: ModuleArchiveEntry[]): ModuleArchiveEntry | undefined {
  return entries.find((entry) => entry.resRef === "module" && entry.resType === IFO_TYPE);
}

function readEntryArea(ifo: ModuleArchiveEntry): string | undefined {
  try {
    const gff = new GFFObject(ifo.data);
    const field = gff.RootNode?.getFieldByLabel("Mod_Entry_Area");
    const value = field?.getValue?.();
    const text = typeof value === "string" ? value.trim() : "";
    return text.length ? text : undefined;
  } catch {
    return undefined;
  }
}

export async function inspectModuleArchive(
  buffer: Uint8Array,
  filename: string,
): Promise<ModuleArchivePreview> {
  const entries = await loadModuleArchiveEntries(buffer);
  const ifo = findModuleIfo(entries);
  return {
    kind: archiveKindFromFilename(filename),
    filename: basenameNoDir(filename),
    resourceCount: entries.length,
    hasModuleIfo: !!ifo,
    entryArea: ifo ? readEntryArea(ifo) : undefined,
    isCompanionRim: isCompanionRimFilename(filename),
    companionFilename: companionRimFilename(filename),
  };
}

export async function tryReadCompanionRim(
  primaryPath: string,
): Promise<{ buffer: Uint8Array; name: string } | undefined> {
  const name = companionRimFilename(primaryPath);
  if (!name || !primaryPath) {
    return undefined;
  }
  try {
    const fs = await import("fs");
    const path = await import("path");
    const sibling = path.join(path.dirname(primaryPath), name);
    const buf = await fs.promises.readFile(sibling);
    return { buffer: new Uint8Array(buf), name };
  } catch {
    return undefined;
  }
}

async function defaultExists(path: string): Promise<boolean> {
  const { ProjectFileSystem } = await import("@/apps/forge/ProjectFileSystem");
  return ProjectFileSystem.exists(path);
}

async function defaultWriteFile(path: string, data: Uint8Array): Promise<boolean> {
  const { ProjectFileSystem } = await import("@/apps/forge/ProjectFileSystem");
  return ProjectFileSystem.writeFile(path, data);
}

export async function importModuleArchive(
  options: ImportModuleArchiveOptions,
): Promise<ImportModuleArchiveResult> {
  const filename = basenameNoDir(options.filename);
  const exists = options.exists || defaultExists;
  const writeFile = options.writeFile || defaultWriteFile;

  const primary = await loadModuleArchiveEntries(options.buffer);
  const ifo = findModuleIfo(primary);
  const projectHasIfo = await exists("module.ifo");
  const isCompanion = isCompanionRimFilename(filename);

  if (!ifo && !(isCompanion && projectHasIfo)) {
    return {
      ok: false,
      reason: isCompanion
        ? "This companion archive has no module.ifo, and the project does not have one yet."
        : "Archive does not contain module.ifo.",
      written: [],
      hasModuleIfo: false,
    };
  }

  if (ifo && projectHasIfo && !options.overwriteExisting) {
    return {
      ok: false,
      reason: "This project already has a module.ifo. Importing will overwrite the existing module.",
      needsOverwrite: true,
      written: [],
      hasModuleIfo: true,
      entryArea: readEntryArea(ifo),
    };
  }

  const merged = [...primary];
  if (options.includeCompanion && options.companionBuffer && options.companionBuffer.byteLength) {
    const companion = await loadModuleArchiveEntries(options.companionBuffer);
    for (let i = 0; i < companion.length; i++) {
      merged.push(companion[i]);
    }
  }

  const written: string[] = [];
  for (let i = 0; i < merged.length; i++) {
    const entry = merged[i];
    options.onProgress?.(i + 1, merged.length, entry.filename);
    const saved = await writeFile(entry.filename, entry.data);
    if (saved) {
      written.push(entry.filename);
    }
  }

  return {
    ok: true,
    written,
    hasModuleIfo: !!ifo || projectHasIfo,
    entryArea: ifo ? readEntryArea(ifo) : undefined,
  };
}
