/**
 * Lightweight blueprint ResRef suggestions for module-editor typeahead.
 *
 * @file blueprintResRefSuggest.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import {
  BlueprintCatalogEntry,
  blueprintResRefFromPath,
  mergeBlueprintCatalog,
} from "@/apps/forge/helpers/blueprintCatalog";
import type { BlueprintType } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";
import * as KotOR from "@/apps/forge/KotOR";

const cache = new Map<BlueprintType, BlueprintCatalogEntry[]>();
const CACHE_TTL_MS = 15000;
const cacheAt = new Map<BlueprintType, number>();

export function invalidateBlueprintSuggestCache(): void {
  cache.clear();
  cacheAt.clear();
}

async function listDirResrefs(
  read: () => Promise<string[]>,
  type: BlueprintType
): Promise<string[]> {
  try {
    const entries = await read();
    const out: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const resref = blueprintResRefFromPath(String(entries[i] || ""), type);
      if (resref) {
        out.push(resref);
      }
    }
    return out;
  } catch {
    return [];
  }
}

function listKeyResrefs(type: BlueprintType): string[] {
  const resType = KotOR.ResourceTypes[type];
  if (typeof resType !== "number") {
    return [];
  }
  const keys = KotOR.KEYManager?.Key?.keys;
  if (!Array.isArray(keys)) {
    return [];
  }
  const out: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].resType === resType) {
      out.push(keys[i].resRef);
    }
  }
  return out;
}

export async function loadBlueprintSuggestions(type: BlueprintType): Promise<BlueprintCatalogEntry[]> {
  const now = Date.now();
  const prior = cache.get(type);
  if (prior && now - (cacheAt.get(type) || 0) < CACHE_TTL_MS) {
    return prior;
  }

  const [override, project] = await Promise.all([
    listDirResrefs(() => KotOR.GameFileSystem.readdir("Override", { recursive: true }), type),
    listDirResrefs(async () => {
      if (!ProjectFileSystem.hasRoot()) {
        return [];
      }
      return ProjectFileSystem.readdir("", { recursive: true });
    }, type),
  ]);

  const merged = mergeBlueprintCatalog([
    { source: "game", entries: listKeyResrefs(type).map((resref) => ({ resref, localizedName: resref })) },
    { source: "override", entries: override.map((resref) => ({ resref, localizedName: resref })) },
    { source: "project", entries: project.map((resref) => ({ resref, localizedName: resref })) },
  ]);

  cache.set(type, merged);
  cacheAt.set(type, now);
  return merged;
}

export async function suggestBlueprintResRefs(
  type: BlueprintType,
  query: string,
  limit: number = 50
): Promise<BlueprintCatalogEntry[]> {
  const all = await loadBlueprintSuggestions(type);
  const q = String(query || "").trim().toLowerCase();
  const filtered = !q
    ? all
    : all.filter(
        (entry) =>
          entry.resref.toLowerCase().includes(q) ||
          entry.localizedName.toLowerCase().includes(q)
      );
  return filtered.slice(0, Math.max(1, limit));
}
