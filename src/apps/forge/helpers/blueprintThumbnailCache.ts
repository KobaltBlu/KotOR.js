/**
 * In-memory + IndexedDB cache for blueprint browser model thumbnails.
 *
 * @file blueprintThumbnailCache.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { clear, createStore, del, get, set } from "idb-keyval";
import { buildBlueprintThumbnailCacheKey } from "@/apps/forge/helpers/blueprintThumbnailFingerprint";
import type { BlueprintCatalogSource } from "@/apps/forge/helpers/blueprintCatalog";
import type { BlueprintType } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export interface BlueprintThumbnailRecord {
  blob: Blob;
  fingerprint: string;
  width: number;
  height: number;
  createdAt: number;
}

const thumbStore = createStore("kotor-forge", "blueprint-thumbnails");
const MEMORY_MAX = 200;
const memoryLru = new Map<string, BlueprintThumbnailRecord>();

let gameDataHookInstalled = false;

function touchMemory(key: string, record: BlueprintThumbnailRecord): BlueprintThumbnailRecord {
  memoryLru.delete(key);
  memoryLru.set(key, record);
  while (memoryLru.size > MEMORY_MAX) {
    const oldest = memoryLru.keys().next().value as string | undefined;
    if (!oldest) {
      break;
    }
    memoryLru.delete(oldest);
  }
  return record;
}

export function blueprintThumbnailCacheKey(
  type: BlueprintType,
  source: BlueprintCatalogSource | undefined,
  resref: string
): string {
  return buildBlueprintThumbnailCacheKey(
    ForgeState.gameProfileKey(),
    type,
    source || "game",
    resref
  );
}

export async function getBlueprintThumbnailFromCache(
  key: string,
  fingerprint: string
): Promise<BlueprintThumbnailRecord | undefined> {
  const mem = memoryLru.get(key);
  if (mem && mem.fingerprint === fingerprint) {
    return touchMemory(key, mem);
  }

  try {
    const stored = (await get(key, thumbStore)) as BlueprintThumbnailRecord | undefined;
    if (stored?.blob && stored.fingerprint === fingerprint) {
      return touchMemory(key, stored);
    }
    if (stored && stored.fingerprint !== fingerprint) {
      await del(key, thumbStore);
    }
  } catch (e) {
    console.warn("getBlueprintThumbnailFromCache", e);
  }
  return undefined;
}

export async function putBlueprintThumbnailInCache(
  key: string,
  record: BlueprintThumbnailRecord
): Promise<void> {
  touchMemory(key, record);
  try {
    await set(key, record, thumbStore);
  } catch (e) {
    console.warn("putBlueprintThumbnailInCache", e);
  }
}

export function clearBlueprintThumbnailMemoryCache(): void {
  memoryLru.clear();
}

export async function invalidateBlueprintThumbnailCache(): Promise<void> {
  clearBlueprintThumbnailMemoryCache();
  try {
    await clear(thumbStore);
  } catch (e) {
    console.warn("invalidateBlueprintThumbnailCache", e);
  }
}

/** Drop session LRU when game profile changes (IDB keys are profile-scoped). */
export function installBlueprintThumbnailGameDataHook(): void {
  if (gameDataHookInstalled) {
    return;
  }
  gameDataHookInstalled = true;
  ForgeState.addEventListener("onGameDataChanged", () => {
    clearBlueprintThumbnailMemoryCache();
  });
}
