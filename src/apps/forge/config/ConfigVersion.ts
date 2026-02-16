/**
 * ConfigVersion – version/tag helpers for Forge (ported from Holocron Toolset).
 * Used for update checks and release tagging.
 */

/**
 * Convert a semantic version string to a toolset release tag (e.g. "2.0.0" -> "v2.0.0-toolset").
 */
export function versionToToolsetTag(version: string): string {
  const dotCount = (version.match(/\./g) || []).length;
  if (dotCount === 2) {
    const secondDotIndex = version.indexOf(".", version.indexOf(".") + 1);
    version = version.slice(0, secondDotIndex) + version.slice(secondDotIndex + 1);
  }
  return `v${version}-toolset`;
}

/**
 * Extract semantic version from a toolset tag (e.g. "v2.0.0-toolset" -> "2.0.0").
 */
export function toolsetTagToVersion(tag: string): string {
  const numericPart = tag.replace(/[^\d.]/g, "");
  const parts = numericPart.split(".").filter(Boolean);
  if (parts.length === 3) return parts.join(".");
  if (parts.length === 2) return parts.join(".");
  if (parts.length > 1) {
    const major = parts[0];
    const rest = parts[1];
    const minor = rest.charAt(0);
    const patch = rest.slice(1) || "0";
    return `${major}.${minor}.${patch}`;
  }
  return parts.length ? `${parts[0]}.0.0` : "0.0.0";
}
