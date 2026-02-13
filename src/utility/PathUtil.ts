/**
 * Path utilities for KotOR/Forge (PyKotor path.CaseAwarePath parity where useful).
 * Normalize paths and handle extension/suffix for resource sidecars (e.g. .txi for .tpc).
 *
 * @file PathUtil.ts
 */

/**
 * Get file extension in lowercase, without leading dot.
 * Handles both forward and backslashes.
 */
export function getExtension(pathOrFilename: string): string {
  const base = pathOrFilename.replace(/\\/g, '/');
  const lastSlash = base.lastIndexOf('/');
  const name = lastSlash >= 0 ? base.slice(lastSlash + 1) : base;
  const lastDot = name.lastIndexOf('.');
  if (lastDot < 0) return '';
  return name.slice(lastDot + 1).toLowerCase();
}

/**
 * Return path with a new suffix (extension).
 * Replaces existing extension; if path has no extension, appends dot + suffix.
 * suffix should not include leading dot (e.g. "txi", not ".txi").
 */
export function withSuffix(pathOrFilename: string, suffix: string): string {
  const base = pathOrFilename.replace(/\\/g, '/');
  const lastSlash = base.lastIndexOf('/');
  const dir = lastSlash >= 0 ? base.slice(0, lastSlash + 1) : '';
  const name = lastSlash >= 0 ? base.slice(lastSlash + 1) : base;
  const lastDot = name.lastIndexOf('.');
  const stem = lastDot < 0 ? name : name.slice(0, lastDot);
  const ext = suffix.startsWith('.') ? suffix.slice(1) : suffix;
  return dir + stem + (ext ? '.' + ext : '');
}

/**
 * Normalize path to use forward slashes (for cross-platform resource keys).
 */
export function normalizePath(pathOrFilename: string): string {
  return pathOrFilename.replace(/\\/g, '/');
}

/**
 * Get path to sidecar file (e.g. .txi for a .tpc).
 * Example: pathTxiForTpc("textures/foo.tpc") => "textures/foo.txi"
 */
export function getSidecarPath(pathOrFilename: string, sidecarExt: string): string {
  return withSuffix(pathOrFilename, sidecarExt);
}
