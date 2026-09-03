/**
 * Merge KEY / Override / project NWScript names into unique resrefs for the script browser.
 *
 * @file scriptResRefCatalog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";

export type ScriptCatalogSource = "project" | "override" | "game";

export interface ScriptCatalogEntry {
  resref: string;
  source: ScriptCatalogSource;
}

export interface ScriptCatalogGroup {
  source: ScriptCatalogSource;
  resrefs: string[];
}

const SOURCE_RANK: Record<ScriptCatalogSource, number> = {
  project: 0,
  override: 1,
  game: 2,
};

export function scriptResRefFromPath(filePath: string): string | null {
  const name = (filePath || "").replace(/\\/g, "/").split("/").pop() || "";
  const match = /^(.+)\.(nss|ncs)$/i.exec(name);
  if (!match) {
    return null;
  }
  const resref = sanitizeResRef(match[1]);
  return resref || null;
}

export function mergeScriptCatalog(groups: ScriptCatalogGroup[]): ScriptCatalogEntry[] {
  const byResref = new Map<string, ScriptCatalogSource>();
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
  const entries: ScriptCatalogEntry[] = [];
  byResref.forEach((source, resref) => {
    entries.push({ resref, source });
  });
  entries.sort((a, b) => a.resref.localeCompare(b.resref));
  return entries;
}
