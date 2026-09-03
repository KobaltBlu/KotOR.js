/**
 * Pack a Forge project's loose module files into a playable .mod ERF.
 *
 * @file exportProjectModule.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ERFObject } from "@/resource/ERFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";

const EXCLUDED_EXT = new Set(["nss", "json", "md", "txt", "ts", "tsx", "js", "map", "log"]);
const EXCLUDED_PREFIXES = [".forge/", ".git/"];

export interface PackProjectModuleOptions {
  files: string[];
  readFile: (path: string) => Promise<Uint8Array | undefined>;
  overrides?: Record<string, Uint8Array>;
  moduleTag?: string;
  projectName?: string;
}

export interface PackProjectModuleResult {
  ok: boolean;
  reason?: string;
  buffer?: Uint8Array;
  filename: string;
  resourceCount: number;
  erf?: ERFObject;
}

export interface BuildProjectModuleErfResult {
  ok: boolean;
  reason?: string;
  filename: string;
  resourceCount: number;
  erf?: ERFObject;
  /** Project .nss files that were skipped (preview needs .ncs). */
  skippedNss: string[];
}

function basename(filepath: string): string {
  const parts = String(filepath || "").replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "";
}

function normalizeRel(filepath: string): string {
  return String(filepath || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

export function modulePackFilename(moduleTag?: string, projectName?: string): string {
  return `${String(moduleTag || projectName || "module").replace(/[^a-z0-9_]/gi, "").slice(0, 16) || "module"}.mod`;
}

export function shouldPackProjectFile(filepath: string): boolean {
  const rel = normalizeRel(filepath);
  if (!rel || rel.endsWith("/")) {
    return false;
  }
  for (let i = 0; i < EXCLUDED_PREFIXES.length; i++) {
    if (rel.startsWith(EXCLUDED_PREFIXES[i])) {
      return false;
    }
  }
  const name = basename(rel);
  const dot = name.lastIndexOf(".");
  if (dot < 0) {
    return false;
  }
  const ext = name.slice(dot + 1).toLowerCase();
  if (EXCLUDED_EXT.has(ext)) {
    return false;
  }
  return typeof ResourceTypes[ext] === "number";
}

/**
 * Build an in-memory ERF from project files + optional live editor overrides.
 * Used by export and by module editor playable preview.
 */
export async function buildProjectModuleErf(options: PackProjectModuleOptions): Promise<BuildProjectModuleErfResult> {
  const filename = modulePackFilename(options.moduleTag, options.projectName);
  const erf = new ERFObject();
  erf.header.fileType = "MOD ";
  erf.header.fileVersion = "V1.0";
  erf.header.localizedStringSize = 0;

  let packed = 0;
  const skippedNss: string[] = [];
  const overrideFiles = Object.keys(options.overrides ?? {});
  const files = Array.from(new Set([...options.files, ...overrideFiles]));
  const overrides = new Map<string, Uint8Array>();
  for (const path of overrideFiles) {
    overrides.set(normalizeRel(path).toLowerCase(), options.overrides![path]);
  }

  for (let i = 0; i < files.length; i++) {
    const rel = normalizeRel(files[i]);
    const name = basename(rel);
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
    if (ext === "nss") {
      skippedNss.push(rel);
      continue;
    }
    if (!shouldPackProjectFile(rel)) {
      continue;
    }
    const resRef = name.slice(0, dot).slice(0, 16);
    const resType = ResourceTypes[ext];
    const data = overrides.get(rel.toLowerCase()) ?? await options.readFile(rel);
    if (!(data instanceof Uint8Array) || !data.byteLength) {
      continue;
    }
    erf.addResource(resRef, resType, data);
    packed++;
  }

  if (!packed) {
    return { ok: false, reason: "No packable module resources found.", filename, resourceCount: 0, skippedNss };
  }

  return {
    ok: true,
    filename,
    resourceCount: packed,
    erf,
    skippedNss,
  };
}

export async function packProjectModule(options: PackProjectModuleOptions): Promise<PackProjectModuleResult> {
  const built = await buildProjectModuleErf(options);
  if (!built.ok || !built.erf) {
    return {
      ok: false,
      reason: built.reason,
      filename: built.filename,
      resourceCount: 0,
    };
  }

  return {
    ok: true,
    buffer: built.erf.getExportBuffer(),
    filename: built.filename,
    resourceCount: built.resourceCount,
    erf: built.erf,
  };
}
