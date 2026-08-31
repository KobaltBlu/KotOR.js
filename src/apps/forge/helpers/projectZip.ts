/**
 * Pack / inspect / materialize a Forge project as a ZIP archive.
 *
 * @file projectZip.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { zipSync, unzipSync } from "fflate";
import { ProjectType } from "@/apps/forge/enum/ProjectType";
import { ProjectSettings } from "@/apps/forge/interfaces/ProjectSettings";
import { resolveProjectGame } from "@/apps/forge/helpers/projectCreateOptions";
import { GameEngineType } from "@/enums/engine/GameEngineType";

const SETTINGS_REL = ".forge/settings.json";
const EXCLUDED_PREFIXES = [".git/"];

export interface PackProjectZipOptions {
  files: string[];
  readFile: (path: string) => Promise<Uint8Array | undefined>;
  projectName?: string;
}

export interface PackProjectZipResult {
  ok: boolean;
  reason?: string;
  buffer?: Uint8Array;
  filename: string;
  fileCount: number;
}

export interface InspectProjectZipResult {
  ok: boolean;
  reason?: string;
  /** Project-relative path → file bytes (directories omitted). */
  files?: Record<string, Uint8Array>;
  settings?: ProjectSettings;
  /** Strip prefix that was removed when normalizing (e.g. "MyProject/"). */
  rootPrefix?: string;
}

function normalizeRel(filepath: string): string {
  return String(filepath || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function sanitizeZipBasename(name?: string): string {
  const raw = String(name || "project").trim() || "project";
  const cleaned = raw.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, "_").slice(0, 64);
  return cleaned || "project";
}

export function projectZipFilename(projectName?: string): string {
  return `${sanitizeZipBasename(projectName)}.zip`;
}

export function shouldIncludeProjectZipFile(filepath: string): boolean {
  const rel = normalizeRel(filepath);
  if (!rel || rel.endsWith("/")) {
    return false;
  }
  for (let i = 0; i < EXCLUDED_PREFIXES.length; i++) {
    if (rel === EXCLUDED_PREFIXES[i].slice(0, -1) || rel.startsWith(EXCLUDED_PREFIXES[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Build a ZIP of the full Forge project tree (includes `.forge/` and source files).
 */
export async function packProjectZip(options: PackProjectZipOptions): Promise<PackProjectZipResult> {
  const filename = projectZipFilename(options.projectName);
  const entries: Record<string, Uint8Array> = {};
  let packed = 0;

  for (let i = 0; i < options.files.length; i++) {
    const rel = normalizeRel(options.files[i]);
    if (!shouldIncludeProjectZipFile(rel)) {
      continue;
    }
    const data = await options.readFile(rel);
    if (!(data instanceof Uint8Array)) {
      continue;
    }
    entries[rel] = data;
    packed++;
  }

  if (!packed) {
    return { ok: false, reason: "No project files found to zip.", filename, fileCount: 0 };
  }

  try {
    const buffer = zipSync(entries, { level: 6 });
    return { ok: true, buffer, filename, fileCount: packed };
  } catch (e) {
    console.error("packProjectZip", e);
    return { ok: false, reason: "Failed to create ZIP archive.", filename, fileCount: 0 };
  }
}

function parseSettingsJson(bytes: Uint8Array): ProjectSettings | undefined {
  try {
    const text = new TextDecoder().decode(bytes);
    const raw = JSON.parse(text) as Partial<ProjectSettings>;
    if (!raw || typeof raw !== "object") {
      return undefined;
    }
    const name = String(raw.name || "").trim();
    if (!name) {
      return undefined;
    }
    const type =
      Number(raw.type) === ProjectType.MODULE || String(raw.type).toUpperCase() === "MODULE"
        ? ProjectType.MODULE
        : ProjectType.OTHER;
    return {
      name,
      game: resolveProjectGame(raw.game as GameEngineType | string),
      type,
      module_editor: {
        open: !!(raw.module_editor && (raw.module_editor as { open?: boolean }).open),
      },
      open_files: Array.isArray(raw.open_files)
        ? (raw.open_files.map((f) => String(f)) as ProjectSettings["open_files"])
        : ([] as ProjectSettings["open_files"]),
    };
  } catch {
    return undefined;
  }
}

function findSettingsKey(keys: string[]): { key: string; prefix: string } | undefined {
  const normalized = keys.map((k) => normalizeRel(k));
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i].toLowerCase() === SETTINGS_REL) {
      return { key: keys[i], prefix: "" };
    }
  }

  const candidates: { key: string; prefix: string }[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const rel = normalized[i];
    const idx = rel.toLowerCase().indexOf(`/${SETTINGS_REL}`);
    if (idx > 0) {
      const prefix = rel.slice(0, idx + 1);
      const after = rel.slice(idx + 1);
      if (after.toLowerCase() === SETTINGS_REL) {
        candidates.push({ key: keys[i], prefix });
      }
    }
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  if (candidates.length > 1) {
    const prefixes = new Set(candidates.map((c) => c.prefix));
    if (prefixes.size === 1) {
      return candidates[0];
    }
  }
  return undefined;
}

/**
 * Unzip and validate a Forge project archive (must contain `.forge/settings.json`).
 */
export function inspectProjectZip(buffer: Uint8Array): InspectProjectZipResult {
  if (!(buffer instanceof Uint8Array) || !buffer.byteLength) {
    return { ok: false, reason: "ZIP is empty or unreadable." };
  }

  let unpacked: Record<string, Uint8Array>;
  try {
    unpacked = unzipSync(buffer);
  } catch (e) {
    console.error("inspectProjectZip", e);
    return { ok: false, reason: "Could not read ZIP archive." };
  }

  const keys = Object.keys(unpacked);
  const found = findSettingsKey(keys);
  if (!found) {
    return {
      ok: false,
      reason: "Not a Forge project ZIP (missing .forge/settings.json). Use New Project from Module for .mod/.rim/.erf.",
    };
  }

  const settings = parseSettingsJson(unpacked[found.key]);
  if (!settings) {
    return { ok: false, reason: "Forge settings.json is invalid or missing a project name." };
  }

  const prefix = found.prefix;
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < keys.length; i++) {
    const rawKey = keys[i];
    const data = unpacked[rawKey];
    if (!(data instanceof Uint8Array)) {
      continue;
    }
    let rel = normalizeRel(rawKey);
    if (prefix) {
      if (!rel.startsWith(prefix) && !rel.toLowerCase().startsWith(prefix.toLowerCase())) {
        continue;
      }
      rel = normalizeRel(rel.slice(prefix.length));
    }
    if (!shouldIncludeProjectZipFile(rel)) {
      continue;
    }
    files[rel] = data;
  }

  if (!files[SETTINGS_REL] && !Object.keys(files).some((k) => k.toLowerCase() === SETTINGS_REL)) {
    files[SETTINGS_REL] = unpacked[found.key];
  }

  return {
    ok: true,
    files,
    settings,
    rootPrefix: prefix || undefined,
  };
}

export interface MaterializeProjectZipOptions {
  files: Record<string, Uint8Array>;
  writeFile: (path: string, data: Uint8Array) => Promise<boolean>;
  mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<boolean>;
  onProgress?: (current: number, total: number, filename: string) => void;
}

export interface MaterializeProjectZipResult {
  ok: boolean;
  reason?: string;
  written: number;
}

/**
 * Write inspected ZIP entries into a project root.
 */
export async function materializeProjectZip(
  options: MaterializeProjectZipOptions,
): Promise<MaterializeProjectZipResult> {
  const entries = Object.keys(options.files || {});
  if (!entries.length) {
    return { ok: false, reason: "ZIP contained no files to write.", written: 0 };
  }

  const dirs = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    const rel = normalizeRel(entries[i]);
    const parts = rel.split("/");
    let acc = "";
    for (let p = 0; p < parts.length - 1; p++) {
      acc = acc ? `${acc}/${parts[p]}` : parts[p];
      if (acc) {
        dirs.add(acc);
      }
    }
  }

  const sortedDirs = Array.from(dirs).sort((a, b) => a.split("/").length - b.split("/").length);
  for (let i = 0; i < sortedDirs.length; i++) {
    await options.mkdir(sortedDirs[i], { recursive: true });
  }

  let written = 0;
  for (let i = 0; i < entries.length; i++) {
    const rel = normalizeRel(entries[i]);
    options.onProgress?.(i + 1, entries.length, rel);
    const ok = await options.writeFile(rel, options.files[entries[i]]);
    if (!ok) {
      return { ok: false, reason: `Failed to write ${rel}.`, written };
    }
    written++;
  }

  return { ok: true, written };
}
