import type { ModuleCreature } from "@engine/module/ModuleCreature";
import type { ModuleObject } from "@engine/module/ModuleObject";
import { getCreaturePersonalSpace } from "@engine/combat/attack-range";

/**
 * Approximate resolveStartOverlapCreatures.
 *
 * Called after a geometric capsule hit in creature capsule clear. Soft-clears when
 * the blocker already overlaps the line start (stacked / starting intersection)
 * or an optional soft-pair creature (pathfind target).
 *
 * Start-overlap soft-clear is directional: escape / outward / tangential steps
 * are allowed, but motion that digs deeper into the blocker along the segment
 * (or tunnels through) stays blocked.
 *
 * @file start-overlap-creatures.ts
 */

export type EvaluateOverlappingResult = {
  /** true = treat geometric hit as clear (return 1). */
  allow: boolean;
};

/**
 * Closest 2D distance from point P to segment AB.
 */
function distPointToSegment2D(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  if(abLenSq < 1e-12){
    return Math.hypot(apx, apy);
  }
  let t = (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

/**
 * @param creaturePos Blocker position
 * @param lineStart Segment origin (path start)
 * @param combinedRadius Self creperspace+0.01 + blocker creperspace
 * @param lineEnd Proposed segment endpoint — when provided, start-overlap soft
 *   clear only allows steps that do not reduce separation anywhere along the
 *   segment (must not dig deeper / walk through).
 */
export function resolveStartOverlapCreatures(
  creaturePos: { x: number; y: number; z?: number },
  lineStart: { x: number; y: number; z?: number },
  combinedRadius: number,
  options: {
    /** Soft-pair creature (pathfind state) — allow if already overlapping it. */
    softCreature?: ModuleObject;
    owner?: ModuleObject;
    /** Proposed segment end; required for directional soft-clear. */
    lineEnd?: { x: number; y: number; z?: number };
  } = {}
): EvaluateOverlappingResult {
  const dx = creaturePos.x - lineStart.x;
  const dy = creaturePos.y - lineStart.y;
  const originDistSq = dx * dx + dy * dy;
  const r2 = combinedRadius * combinedRadius;

  // Already intersecting the start point → candidate for soft allow.
  // Include exact boundary (and a tiny epsilon): exact creperspace contact must
  // soft-clear or tickCreatureWalk / walk tick probes stay blocked while buildPathAroundCreature
  // re-splices without advancing (stunt12 Malak vs bridge officer).
  const eps = 1e-3;
  if(originDistSq <= r2 + eps){
    const lineEnd = options.lineEnd;
    if(lineEnd){
      const originDist = Math.sqrt(originDistSq);
      // Closest approach along the segment must not dig deeper than the start.
      // Rejects inward steps and tunnel-through (closest mid-segment → 0).
      const closest = distPointToSegment2D(
        creaturePos.x, creaturePos.y,
        lineStart.x, lineStart.y,
        lineEnd.x, lineEnd.y
      );
      if(closest + 1e-4 < originDist){
        return { allow: false };
      }
    }
    return { allow: true };
  }

  const soft = options.softCreature as ModuleCreature | undefined;
  const owner = options.owner as ModuleCreature | undefined;
  if(soft?.position && owner){
    const sx = soft.position.x - creaturePos.x;
    const sy = soft.position.y - creaturePos.y;
    const softR =
      getCreaturePersonalSpace(soft) + getCreaturePersonalSpace(owner);
    if(sx * sx + sy * sy < softR * softR){
      return { allow: true };
    }
  }

  return { allow: false };
}
