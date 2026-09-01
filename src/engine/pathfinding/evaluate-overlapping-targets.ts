import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { getCreaturePersonalSpace } from "@/combat/attack-range";

/**
 * Approximate EvaluateOverlappingTargets.
 *
 * Called after a geometric capsule hit in NoCreaturesOnLine. Soft-clears when
 * the blocker already overlaps the line start (stacked / starting intersection)
 * or an optional soft-pair creature (retail pathfind target).
 *
 * @file evaluate-overlapping-targets.ts
 */

export type EvaluateOverlappingResult = {
  /** true = treat geometric hit as clear (retail return 1). */
  allow: boolean;
};

/**
 * @param creaturePos Blocker position
 * @param lineStart Segment origin (path start)
 * @param combinedRadius Self creperspace+0.01 + blocker creperspace
 */
export function evaluateOverlappingTargets(
  creaturePos: { x: number; y: number; z?: number },
  lineStart: { x: number; y: number; z?: number },
  combinedRadius: number,
  options: {
    /** Soft-pair creature (retail pathfind state) — allow if already overlapping it. */
    softCreature?: ModuleObject;
    owner?: ModuleObject;
  } = {}
): EvaluateOverlappingResult {
  const dx = creaturePos.x - lineStart.x;
  const dy = creaturePos.y - lineStart.y;
  const distSq = dx * dx + dy * dy;
  const r2 = combinedRadius * combinedRadius;

  // Already intersecting the start point → soft allow (stacked at origin).
  // Include exact boundary (and a tiny epsilon): exact creperspace contact must
  // soft-clear or WalkUpdate probes stay blocked while PlotPathAroundCreature
  // re-splices without advancing (stunt12 Malak vs bridge officer).
  const eps = 1e-3;
  if(distSq <= r2 + eps){
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
