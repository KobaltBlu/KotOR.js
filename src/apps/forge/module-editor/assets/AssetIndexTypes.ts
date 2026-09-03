/**
 * Unified asset index types for project + KEY resources.
 *
 * @file AssetIndexTypes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type AssetOrigin = "project" | "key" | "override";

export interface AssetIndexEntry {
  resref: string;
  resType: number;
  extension: string;
  origin: AssetOrigin;
  path?: string;
  localizedName?: string;
  thumbnail?: string;
  tags?: string[];
}

export interface AssetIndexSnapshot {
  entries: AssetIndexEntry[];
  builtAt: number;
  durationMs: number;
  projectCount: number;
  keyCount: number;
}
