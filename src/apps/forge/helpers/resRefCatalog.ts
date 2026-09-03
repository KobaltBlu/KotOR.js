/**
 * Merge KEY / Override / project / stream-folder names into unique resrefs for browsers.
 *
 * @file resRefCatalog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";

export type ResRefCatalogSource = "project" | "override" | "game";

export interface ResRefCatalogEntry {
  resref: string;
  source: ResRefCatalogSource;
}

export interface ResRefCatalogGroup {
  source: ResRefCatalogSource;
  resrefs: string[];
}

const SOURCE_RANK: Record<ResRefCatalogSource, number> = {
  project: 0,
  override: 1,
  game: 2,
};

export function resRefFromPath(filePath: string, extensions: string[]): string | null {
  const name = (filePath || "").replace(/\\/g, "/").split("/").pop() || "";
  const match = /^(.+)\.([^.]+)$/.exec(name);
  if (!match) {
    return null;
  }
  const ext = match[2].toLowerCase();
  const allowed = extensions.map((item) => item.toLowerCase());
  if (!allowed.includes(ext)) {
    return null;
  }
  const resref = sanitizeResRef(match[1]);
  return resref || null;
}

export function mergeResRefCatalog(groups: ResRefCatalogGroup[]): ResRefCatalogEntry[] {
  const byResref = new Map<string, ResRefCatalogSource>();
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const resrefs = group.resrefs || [];
    for (let j = 0; j < resrefs.length; j++) {
      const resref = sanitizeResRef(resrefs[j] || "");
      if (!resref) {
        continue;
      }
      const existing = byResref.get(resref);
      if (existing === undefined || SOURCE_RANK[group.source] < SOURCE_RANK[existing]) {
        byResref.set(resref, group.source);
      }
    }
  }
  const entries: ResRefCatalogEntry[] = [];
  byResref.forEach((source, resref) => {
    entries.push({ resref, source });
  });
  entries.sort((a, b) => a.resref.localeCompare(b.resref));
  return entries;
}
