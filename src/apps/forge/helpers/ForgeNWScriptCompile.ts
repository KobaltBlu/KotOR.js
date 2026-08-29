import * as path from "path";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { NWScriptCompiler } from "@/nwscript/compiler/NWScriptCompiler";
import {
  COMPILED_DIR,
  compiledNcsPathForProjectNss,
  normalizeProjectRelativePath,
} from "@/apps/forge/helpers/forgeNcsCompilePaths";
import { collectNssIncludeResrefs, normalizeNssIncludeResref } from "@/apps/forge/helpers/nssIncludeResref";

export {
  COMPILED_DIR,
  GAME_OVERRIDE_DIR,
  compiledNcsOverrideRelativePath,
  compiledNcsPathForProjectNss,
  normalizeProjectRelativePath,
} from "@/apps/forge/helpers/forgeNcsCompilePaths";

export { collectNssIncludeResrefs, normalizeNssIncludeResref } from "@/apps/forge/helpers/nssIncludeResref";

const NSS_DECODER = new TextDecoder();

function decodeNssBuffer(buffer?: Uint8Array | null): string | undefined {
  if (!buffer || !buffer.length) return undefined;
  return NSS_DECODER.decode(buffer);
}

function findNssKeyEntry(resref: string) {
  const keyTable = KotOR.KEYManager?.Key;
  if (!keyTable) return undefined;
  const nssType = KotOR.ResourceTypes.nss;
  const lowered = resref.toLowerCase();
  return (
    keyTable.getFileKey(resref, nssType)
    ?? keyTable.getFileKey(lowered, nssType)
    ?? keyTable.keys?.find((key: { resRef?: string; resType?: number }) => {
      return key.resType === nssType && String(key.resRef || "").trim().toLowerCase() === lowered;
    })
  );
}

function nssSourceFromOpenTabs(resref: string): string | undefined {
  const tabs = ForgeState.tabManager?.tabs || [];
  for (const tab of tabs) {
    const file = (tab as any)?.file;
    if (!file) continue;
    const ext = String(file.ext || "nss").toLowerCase();
    if (ext !== "nss") continue;
    if (String(file.resref || "").toLowerCase() !== resref) continue;
    const text = (tab as any).editor?.getModel?.()?.getValue?.() ?? (tab as any).code;
    if (typeof text === "string" && text.length) return text;
  }
  return undefined;
}

async function nssBufferFromProject(
  resref: string,
  projectIndex?: Map<string, string>,
): Promise<Uint8Array | undefined> {
  if (!ProjectFileSystem.hasRoot()) {
    return undefined;
  }
  const index = projectIndex ?? await indexProjectNssFiles();
  const rel = index.get(resref);
  if (!rel) return undefined;
  try {
    const buffer = await ProjectFileSystem.readFile(rel);
    return buffer?.length ? buffer : undefined;
  } catch {
    return undefined;
  }
}

async function indexProjectNssFiles(): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  if (!ProjectFileSystem.hasRoot()) {
    return index;
  }
  let entries: string[] = [];
  try {
    entries = await ProjectFileSystem.readdir("", { recursive: true });
  } catch {
    return index;
  }
  for (const entry of entries) {
    const posix = String(entry || "").replace(/\\/g, "/");
    const base = posix.split("/").pop() || "";
    if (!base.toLowerCase().endsWith(".nss")) continue;
    const resref = normalizeNssIncludeResref(base);
    if (resref && !index.has(resref)) index.set(resref, entry);
  }
  return index;
}

async function nssBufferFromOverride(resref: string): Promise<Uint8Array | undefined> {
  const filepath = path.join("Override", `${resref}.nss`);
  try {
    if (!(await KotOR.GameFileSystem.exists(filepath))) return undefined;
    const buffer = await KotOR.GameFileSystem.readFile(filepath);
    return buffer?.length ? buffer : undefined;
  } catch {
    return undefined;
  }
}

async function nssBufferFromArchives(resref: string): Promise<Uint8Array | undefined> {
  try {
    const fromLoader = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.nss, resref);
    if (fromLoader?.length) return fromLoader;
  } catch {
    // KEY lookups are case-sensitive; fall through to a case-insensitive BIF index scan.
  }

  const key = findNssKeyEntry(resref);
  if (!key) return undefined;
  try {
    const buffer = await KotOR.KEYManager.Key.getFileBuffer(key);
    return buffer?.length ? buffer : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Load an NSS buffer: open editor, project, Override, then KEY/BIF archives.
 */
export async function loadNssSourceBuffer(
  resref: string,
  projectIndex?: Map<string, string>,
): Promise<Uint8Array | undefined> {
  const normalized = normalizeNssIncludeResref(resref);
  if (!normalized) return undefined;

  const fromTab = nssSourceFromOpenTabs(normalized);
  if (fromTab != null) return new TextEncoder().encode(fromTab);

  const fromProject = await nssBufferFromProject(normalized, projectIndex);
  if (fromProject) return fromProject;

  const fromOverride = await nssBufferFromOverride(normalized);
  if (fromOverride) return fromOverride;

  if (normalized === "nwscript" && ForgeState.nwscript_nss?.length) {
    return ForgeState.nwscript_nss;
  }

  return nssBufferFromArchives(normalized);
}

/**
 * Resolve #include directives from project / Override first, KEY/BIF archives as fallback.
 */
export async function resolveIncludesForNss(
  code: string,
  includeMap: Map<string, string> = new Map()
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  for (const [raw, source] of includeMap) {
    const resref = normalizeNssIncludeResref(raw);
    if (resref && !resolved.has(resref)) resolved.set(resref, source);
  }

  const visited = new Set<string>();
  const projectIndex = await indexProjectNssFiles();

  const loadInclude = async (rawResref: string) => {
    const resref = normalizeNssIncludeResref(rawResref);
    if (!resref || visited.has(resref)) return;
    visited.add(resref);

    let source = resolved.get(resref);
    if (source == null) {
      source = decodeNssBuffer(await loadNssSourceBuffer(resref, projectIndex));
      if (source == null) return;
      resolved.set(resref, source);
    }

    for (const nestedResref of collectNssIncludeResrefs(source)) {
      if (!visited.has(nestedResref)) await loadInclude(nestedResref);
    }
  };

  for (const resref of collectNssIncludeResrefs(code)) {
    await loadInclude(resref);
  }

  return resolved;
}

export type CompileNssSourceResult = {
  ok: boolean;
  ncs?: Uint8Array;
  errors: any[];
  includeMap: Map<string, string>;
  mergedCode: string;
};

/** Parse + compile NSS source using shared Forge NWScript pipeline (same as editor).
 * Compiler and include resolution never throw — failures are surfaced in `errors` so bulk runs can continue.
 */
export async function compileNssSource(
  rootSource: string,
  includeMapSeed: Map<string, string> = new Map()
): Promise<CompileNssSourceResult> {
  try {
    const includeMap = await resolveIncludesForNss(rootSource, includeMapSeed);
    const mergedCode = [[...includeMap.values()].join("\n"), rootSource].join("\n");
    ForgeState.nwScriptParser.parseScript(mergedCode);

    if (ForgeState.nwScriptParser.errors.length) {
      return {
        ok: false,
        errors: [...ForgeState.nwScriptParser.errors],
        includeMap,
        mergedCode,
      };
    }

    const nwScriptCompiler = new NWScriptCompiler(ForgeState.nwScriptParser.program as any);
    let buffer: Uint8Array | undefined;
    try {
      buffer = nwScriptCompiler.compile();
    } catch (compileErr: any) {
      return {
        ok: false,
        errors: [
          {
            type: "compile_throw",
            message: compileErr?.message ?? String(compileErr),
          },
        ],
        includeMap,
        mergedCode,
      };
    }

    if (!buffer) {
      return { ok: false, errors: [], includeMap, mergedCode };
    }

    return { ok: true, ncs: buffer, errors: [], includeMap, mergedCode };
  } catch (e: any) {
    return {
      ok: false,
      errors: [{ type: "compile", message: e?.message ?? String(e) }],
      includeMap: new Map(includeMapSeed),
      mergedCode: "",
    };
  }
}

export interface BulkProjectNssFailure {
  relativePath: string;
  messages: string[];
}

export interface BulkProjectNssCompileOutcome {
  total: number;
  succeeded: number;
  failed: number;
  abortedReason?: string;
  failures: BulkProjectNssFailure[];
  written: string[];
}

function basenameLower(p: string): string {
  return path.posix.basename(normalizeProjectRelativePath(p)).toLowerCase();
}

/** True if bulk should compile this NSS (mirror external bulk_compile.bat skips). */
export function shouldBulkCompileProjectNssPath(projectRelPath: string): boolean {
  const norm = normalizeProjectRelativePath(projectRelPath);
  const firstSeg = norm.split("/").filter(Boolean)[0] ?? "";
  if (firstSeg.toLowerCase() === COMPILED_DIR) return false;

  const ext = path.posix.extname(norm).toLowerCase();
  if (ext !== ".nss") return false;

  const base = basenameLower(norm);
  if (base === "nwscript.nss") return false;

  return true;
}

async function mkdirParentOfProjectRelativeFile(projectRelTargetPath: string): Promise<boolean> {
  const norm = normalizeProjectRelativePath(projectRelTargetPath);
  const dirOnly = path.posix.dirname(norm);
  if (!dirOnly || dirOnly === ".") return true;
  const nativeDir = dirOnly.split("/").join(path.sep);
  return ProjectFileSystem.mkdir(nativeDir, { recursive: true });
}

/** Recursively enumerate `.nss`, compile with `{COMPILED_DIR}/` mirrored output. */
export async function compileAllNssInProject(): Promise<BulkProjectNssCompileOutcome> {
  if (!ProjectFileSystem.hasRoot()) {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      abortedReason: "No project folder is open.",
      failures: [],
      written: [],
    };
  }

  let allPaths: string[];
  try {
    allPaths = await ProjectFileSystem.readdir("", { recursive: true });
  } catch (e: any) {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      abortedReason: e?.message || "Failed to list project files.",
      failures: [],
      written: [],
    };
  }

  const nssPaths = [...new Set(allPaths.map(normalizeProjectRelativePath))].filter((p) =>
    shouldBulkCompileProjectNssPath(p)
  );
  nssPaths.sort();

  const failures: BulkProjectNssFailure[] = [];
  const written: string[] = [];
  let succeeded = 0;

  for (const relPath of nssPaths) {
    try {
      console.log("[Compile all NSS]", relPath, "->", compiledNcsPathForProjectNss(relPath));
      let raw: Uint8Array | undefined;
      try {
        raw = await ProjectFileSystem.readFile(relPath);
      } catch {
        failures.push({
          relativePath: relPath,
          messages: ["Could not read file."],
        });
        continue;
      }
      if (!raw || !raw.length) {
        failures.push({ relativePath: relPath, messages: ["Empty or unreadable file."] });
        continue;
      }

      const rootSource = new TextDecoder().decode(raw);
      const result = await compileNssSource(rootSource, new Map());

      if (!result.ok || !result.ncs) {
        const messages =
          result.errors.length > 0
            ? result.errors.map((ev: any) => ev?.message || String(ev))
            : ["Compilation produced no bytecode."];
        failures.push({ relativePath: relPath, messages });
        continue;
      }

      const outRel = compiledNcsPathForProjectNss(relPath);
      const mk = await mkdirParentOfProjectRelativeFile(outRel);
      if (!mk) {
        failures.push({
          relativePath: relPath,
          messages: [`Could not create output directory for ${outRel}`],
        });
        continue;
      }

      try {
        const okWrite = await ProjectFileSystem.writeFile(outRel, result.ncs);
        if (!okWrite) {
          failures.push({ relativePath: relPath, messages: [`Failed writing ${outRel}`] });
          continue;
        }
      } catch (we: any) {
        failures.push({
          relativePath: relPath,
          messages: [we?.message ? `Write failed: ${we.message}` : "Write failed."],
        });
        continue;
      }

      written.push(outRel);
      succeeded++;
    } catch (iterationErr: any) {
      failures.push({
        relativePath: relPath,
        messages: [iterationErr?.message ?? String(iterationErr)],
      });
    }
  }

  return {
    total: nssPaths.length,
    succeeded,
    failed: failures.length,
    failures,
    written,
  };
}

/**
 * Save open editors, then compile every project `.nss` so packing/preview
 * includes fresh `.ncs` bytecode. Returns ok only when nothing failed.
 */
export async function compileAllNssBeforeModulePack(): Promise<{
  ok: boolean;
  outcome: BulkProjectNssCompileOutcome;
}> {
  try {
    await ForgeState.saveAllEditorTabs();
  } catch (e) {
    console.warn("compileAllNssBeforeModulePack: saveAllEditorTabs", e);
  }

  const outcome = await compileAllNssInProject();
  const ok = !outcome.abortedReason && outcome.failed === 0;
  return { ok, outcome };
}

/** Summarize a bulk compile failure for alerts / preview progress. */
export function formatBulkNssCompileFailure(outcome: BulkProjectNssCompileOutcome): string {
  if (outcome.abortedReason) {
    return outcome.abortedReason;
  }
  if (outcome.failed <= 0) {
    return "Script compilation failed.";
  }
  const sample = outcome.failures
    .slice(0, 3)
    .map((f) => `${f.relativePath}: ${f.messages[0] || "error"}`)
    .join("\n");
  const more = outcome.failed > 3 ? `\n…and ${outcome.failed - 3} more` : "";
  return `Script compile failed (${outcome.failed} of ${outcome.total}).\n${sample}${more}`;
}
