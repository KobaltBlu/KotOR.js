/**
 * Capsule and container file type helpers.
 */

function getExt(filepath: string): string {
  const s = filepath.toLowerCase();
  const i = s.lastIndexOf(".");
  return i >= 0 ? s.slice(i) : "";
}

/** True if filename has .mod extension. */
export function isModFile(filepath: string): boolean {
  return getExt(filepath) === ".mod";
}

/** True if filename has .erf extension. */
export function isErfFile(filepath: string): boolean {
  return getExt(filepath) === ".erf";
}

/** True if filename has .sav extension. */
export function isSavFile(filepath: string): boolean {
  return getExt(filepath) === ".sav";
}

/** True if filename has .erf, .mod, or .sav extension. */
export function isAnyErfTypeFile(filepath: string): boolean {
  const ext = getExt(filepath);
  return ext === ".erf" || ext === ".mod" || ext === ".sav";
}

/** True if filename has .rim extension. */
export function isRimFile(filepath: string): boolean {
  return getExt(filepath) === ".rim";
}

/** True if filename has .erf, .mod, .sav, or .rim extension (capsule containers). */
export function isCapsuleFile(filepath: string): boolean {
  const ext = getExt(filepath);
  return ext === ".erf" || ext === ".mod" || ext === ".sav" || ext === ".rim";
}

/**
 * Returns the module root name from a module/capsule filename.
 * Strips .mod, .erf, .rim extensions and _s / _dlg suffixes (case-insensitive).
 */
export function getModuleRoot(moduleName: string): string {
  let name = moduleName.trim();
  if (!name) return name;
  const lower = name.toLowerCase();
  if (lower.endsWith(".mod") || lower.endsWith(".erf") || lower.endsWith(".rim")) {
    name = name.slice(0, -4);
  }
  if (name.toLowerCase().endsWith("_s")) {
    name = name.slice(0, -2);
  }
  if (name.toLowerCase().endsWith("_dlg")) {
    name = name.slice(0, -4);
  }
  return name;
}
