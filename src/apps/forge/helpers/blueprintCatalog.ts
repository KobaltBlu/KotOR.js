/**
 * Merge KEY / Override / project blueprint resrefs for the blueprint browser.
 *
 * @file blueprintCatalog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";
import type { BlueprintType } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";

export type BlueprintCatalogSource = "project" | "override" | "game";

export interface BlueprintCatalogEntry {
  resref: string;
  source: BlueprintCatalogSource;
  localizedName: string;
  /** Relative project/override path when known (for loading without a KEY hit). */
  path?: string;
}

export interface BlueprintCatalogGroup {
  source: BlueprintCatalogSource;
  entries: Array<{ resref: string; localizedName?: string; path?: string }>;
}

const SOURCE_RANK: Record<BlueprintCatalogSource, number> = {
  project: 0,
  override: 1,
  game: 2,
};

export function blueprintResRefFromPath(filePath: string, blueprintType: BlueprintType): string | null {
  const name = (filePath || "").replace(/\\/g, "/").split("/").pop() || "";
  const match = /^(.+)\.([^.]+)$/i.exec(name);
  if (!match) {
    return null;
  }
  if (match[2].toLowerCase() !== blueprintType) {
    return null;
  }
  const resref = sanitizeResRef(match[1]);
  return resref || null;
}

export function mergeBlueprintCatalog(groups: BlueprintCatalogGroup[]): BlueprintCatalogEntry[] {
  const byResref = new Map<string, BlueprintCatalogEntry>();
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const entries = group.entries || [];
    for (let j = 0; j < entries.length; j++) {
      const raw = entries[j];
      const resref = sanitizeResRef(raw.resref || "");
      if (!resref) {
        continue;
      }
      const existing = byResref.get(resref);
      if (existing === undefined || SOURCE_RANK[group.source] < SOURCE_RANK[existing.source]) {
        byResref.set(resref, {
          resref,
          source: group.source,
          localizedName: String(raw.localizedName || resref),
          path: raw.path,
        });
      }
    }
  }
  const merged: BlueprintCatalogEntry[] = [];
  byResref.forEach((entry) => {
    merged.push(entry);
  });
  merged.sort((a, b) => a.resref.localeCompare(b.resref));
  return merged;
}
