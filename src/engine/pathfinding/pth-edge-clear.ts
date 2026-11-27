import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";
import type { PathPoint } from "@engine/pathfinding/PathPoint";
import { GameState } from "@engine/runtime/GameState";
import { isCreature } from "@engine/module/guards/isCreature";
import { isCreatureCapsuleClear } from "@engine/pathfinding/creature-capsule-clear";
import { isStaticWalkClearDetailed } from "@engine/pathfinding/static-walk-blockers";
import { isPthEdgeBlockedByObject } from "@engine/pathfinding/pth-edge-block";
import {
  getPthStaticEdgeTable,
  setPthStaticEdgeTable,
  invalidatePthStaticEdgeTable,
  type PthStaticEdgeTable,
} from "@engine/pathfinding/pth-static-edge-table";
import type { Vector3 } from "three";

export { invalidatePthStaticEdgeTable };

/**
 * Cheap PTH / fan-out clearance for GenerateSuccessors.
 *
 * Authored graph edges encode walkable corridors — do not run locomotion-grade
 * hasWalkLineClear (clip / adaptive samples / room BFS) here. That pipeline is
 * for direct-line, smooth, and drive/hop validation only.
 *
 * Static: doors + placeables via isStaticWalkClearDetailed(skipMesh), gated by
 * isPthEdgeBlockedByObject. Precomputed per undirected PTH id-pair when possible.
 *
 * @file pth-edge-clear.ts
 */

export function pthEdgeKey(aId: number, bId: number): string {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

/**
 * Live thin static test: doors/placeables only (no room non-walk mesh stadium).
 * Returns true when a placeable or static door blocks the chord.
 */
export function isPthStaticEdgeBlockedLive(
  area: Area,
  from: Vector3,
  to: Vector3,
  ignoreObjectIds?: number[]
): boolean {
  const polys = isStaticWalkClearDetailed(area, from, to, {
    personalSpace: 0,
    skipMesh: true,
    ignoreObjectIds,
  });
  if(polys.clear) return false;
  const obj = GameState.GameObjectManager?.GetObjectById?.(polys.blockingObjectId);
  return isPthEdgeBlockedByObject(obj);
}

/**
 * Build / reuse undirected static-blocked bits for authored PTH connections.
 */
export function ensurePthStaticEdgeTable(
  area: Area,
  points: PathPoint[] | undefined
): PthStaticEdgeTable {
  let table = getPthStaticEdgeTable(area);
  if(table) return table;

  table = new Map();
  if(points?.length){
    const seen = new Set<string>();
    for(let i = 0, len = points.length; i < len; i++){
      const p = points[i];
      if(!p || p.isTemp || p.id < 0) continue;
      const conns = p.connections;
      if(!conns?.length) continue;
      for(let j = 0, jl = conns.length; j < jl; j++){
        const n = conns[j];
        if(!n || n.isTemp || n.id < 0 || n === p) continue;
        const key = pthEdgeKey(p.id, n.id);
        if(seen.has(key)) continue;
        seen.add(key);
        table.set(key, isPthStaticEdgeBlockedLive(area, p.vector, n.vector));
      }
    }
  }
  setPthStaticEdgeTable(area, table);
  return table;
}

function ignoreIdsForOwner(owner?: GameObject): number[] | undefined {
  if(!isCreature(owner)) return undefined;
  const id = (owner as Creature).pathFindIgnoreObjectId | 0;
  return id ? [id] : undefined;
}

/**
 * True when a PTH / fan-out chord is blocked by a static door or placeable.
 * Uses the precomputed table for authored id pairs; live thin test otherwise.
 */
export function isPthStaticEdgeBlocked(
  area: Area | undefined,
  from: PathPoint | undefined,
  to: PathPoint | undefined,
  owner?: GameObject
): boolean {
  if(!area || !from?.vector || !to?.vector) return false;
  const ignore = ignoreIdsForOwner(owner);

  if(
    !from.isTemp && !to.isTemp &&
    from.id >= 0 && to.id >= 0 &&
    area.path?.points?.length
  ){
    const table = ensurePthStaticEdgeTable(area, area.path.points);
    const key = pthEdgeKey(from.id, to.id);
    const cached = table.get(key);
    if(cached !== undefined){
      // Ignore-object override still needs a live probe when the cache says blocked.
      if(!cached || !ignore?.length) return cached;
    }
  }

  return isPthStaticEdgeBlockedLive(area, from.vector, to.vector, ignore);
}

function asPathPoint(v: PathPoint | Vector3): PathPoint | undefined {
  const p = v as PathPoint;
  return p && p.vector != null && typeof p.id === "number" ? p : undefined;
}

/**
 * Thin graph LOS: creature capsules + static door/placeable only.
 * No hasWalkLineClear / clip / samples / room connectivity.
 */
export function isPthThinLineClear(
  area: Area | undefined,
  from: PathPoint | Vector3,
  to: PathPoint | Vector3,
  owner?: GameObject,
  options: { checkCreatures?: boolean } = {}
): boolean {
  if(!area) return true;

  const fromPt = asPathPoint(from);
  const toPt = asPathPoint(to);
  const fromV = fromPt?.vector ?? (from as Vector3);
  const toV = toPt?.vector ?? (to as Vector3);

  if(options.checkCreatures !== false){
    const creatures = isCreatureCapsuleClear(area, fromV, toV, {
      owner,
      allowPartyCreatures: true,
    });
    if(!creatures.clear) return false;
  }

  if(fromPt && toPt){
    return !isPthStaticEdgeBlocked(area, fromPt, toPt, owner);
  }
  return !isPthStaticEdgeBlockedLive(area, fromV, toV, ignoreIdsForOwner(owner));
}
