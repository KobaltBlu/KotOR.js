/**
 * ListModuleFiles – list MOD/RIM/ERF files in a game modules folder.
 * Ported from Holocron SelectModuleDialog module listing.
 * Used for "Load from game modules" and similar flows.
 */

export interface ModuleFileEntry {
  /** Display name (filename without path). */
  name: string;
  /** Full path to file. */
  path: string;
  /** Module root (e.g. end_m01aa_s from end_m01aa_s.rim). */
  root: string;
}

const MOD_EXT = /\.(mod|rim|erf)$/i;

/**
 * List module files (.mod, .rim, .erf) in a directory.
 * Requires Node/Electron fs. Returns entries sorted by name.
 */
export async function listModuleFiles(modulesDir: string): Promise<ModuleFileEntry[]> {
  const isNode =
    typeof process !== "undefined" && process.versions?.node != null;
  if (!isNode) return [];

  const fs = await import("fs");
  const path = await import("path");

  let entries: string[];
  try {
    entries = await fs.promises.readdir(modulesDir);
  } catch {
    return [];
  }

  const result: ModuleFileEntry[] = [];
  const seen = new Set<string>();

  for (const e of entries) {
    if (!MOD_EXT.test(e)) continue;
    const fullPath = path.join(modulesDir, e);
    try {
      const stat = await fs.promises.stat(fullPath);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }
    const root = e.replace(MOD_EXT, "").toLowerCase();
    if (seen.has(root)) continue;
    seen.add(root);
    result.push({ name: e, path: fullPath, root });
  }

  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}
