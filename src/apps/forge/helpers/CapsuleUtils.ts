/**
 * Capsule/container file type helpers. Ported from PyKotor tools.misc.
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
