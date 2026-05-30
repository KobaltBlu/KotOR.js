import * as path from "path";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { NWScriptCompiler } from "@/nwscript/compiler/NWScriptCompiler";

const COMPILED_DIR = "ncs";

/** Normalize project-relative paths to POSIX-style slashes. */
export function normalizeProjectRelativePath(projectRelPath: string): string {
  return projectRelPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

/**
 * Resolve #include directives the same way the script editor does (via KEY/archives).
 */
export async function resolveIncludesForNss(
  code: string,
  includeMap: Map<string, string> = new Map()
): Promise<Map<string, string>> {
  const visited = new Set<string>();

  const loadInclude = async (resref: string) => {
    if (!resref || visited.has(resref)) return;
    visited.add(resref);

    const key = KotOR.KEYManager.Key.getFileKey(resref, KotOR.ResourceTypes.nss);
    if (!key) return;
    const buffer = await KotOR.KEYManager.Key.getFileBuffer(key);
    if (!buffer) return;

    const textDecoder = new TextDecoder();
    const source = textDecoder.decode(buffer);

    const nestedIncludes = [...source.matchAll(/#include\s*"?([\w\.]+)"?/g)];
    for (const m of nestedIncludes) {
      const nestedResref = m[1];
      if (nestedResref && !includeMap.has(nestedResref)) await loadInclude(nestedResref);
    }

    if (!includeMap.has(resref)) {
      includeMap.set(resref, source);
    }
  };

  const rootIncludes = [...code.matchAll(/#include\s*"?([\w\.]+)"?/g)];
  for (const m of rootIncludes) {
    const resref = m[1];
    if (resref && !includeMap.has(resref)) await loadInclude(resref);
  }

  return includeMap;
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

/** Destination under project root: `{COMPILED_DIR}/<mirror>.ncs`. */
export function compiledNcsPathForProjectNss(projectRelNss: string): string {
  const norm = normalizeProjectRelativePath(projectRelNss);
  const dir = path.posix.dirname(norm);
  const baseNoExt = path.posix.basename(norm, ".nss");
  const leaf = `${baseNoExt}.ncs`;
  if (dir === "." || dir === "") return path.posix.join(COMPILED_DIR, leaf);
  return path.posix.join(COMPILED_DIR, dir, leaf);
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
  if (!ProjectFileSystem.rootDirectoryPath && !ProjectFileSystem.rootDirectoryHandle) {
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
