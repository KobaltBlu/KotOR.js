import type { ModuleArea } from "@/module/ModuleArea";
import type { Vector3 } from "three";

/**
 * Per-area cache for static walkmesh-edge clear results
 * ({@link isWalkmeshEdgeWalkClear} — creatures ignored, personalSpace 0).
 *
 * @file walkmesh-edge-clear-cache.ts
 */

/** Quantize endpoints for the static edge cache (~1cm). */
const EDGE_CACHE_SCALE = 100;

const _edgeWalkClearCache = new WeakMap<ModuleArea, Map<string, boolean>>();

export function edgeCacheKey(from: Vector3, to: Vector3): string {
  const ax = Math.round(from.x * EDGE_CACHE_SCALE);
  const ay = Math.round(from.y * EDGE_CACHE_SCALE);
  const bx = Math.round(to.x * EDGE_CACHE_SCALE);
  const by = Math.round(to.y * EDGE_CACHE_SCALE);
  // Undirected: canonicalize endpoint order.
  if(ax < bx || (ax === bx && ay <= by)){
    return `${ax},${ay}|${bx},${by}`;
  }
  return `${bx},${by}|${ax},${ay}`;
}

export function getWalkmeshEdgeClearCached(
  area: ModuleArea,
  key: string
): boolean | undefined {
  return _edgeWalkClearCache.get(area)?.get(key);
}

export function setWalkmeshEdgeClearCached(
  area: ModuleArea,
  key: string,
  clear: boolean
): void {
  let cache = _edgeWalkClearCache.get(area);
  if(!cache){
    cache = new Map();
    _edgeWalkClearCache.set(area, cache);
  }
  cache.set(key, clear);
}

/** Drop cached walkmesh-edge clear results for an area (doors / blockers changed). */
export function invalidateWalkmeshEdgeClearCache(area: ModuleArea | undefined): void {
  if(!area) return;
  _edgeWalkClearCache.delete(area);
}
