import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { getCreaturePersonalSpace, getPathPersonalSpace } from "@/combat/attack-range";
import { hasClearWalkLine } from "@/engine/pathfinding/walk-line-clear";

/**
 * PathPointDFSGenerateSuccessors creature detour:
 * When creature capsule clear fails, cost = |A→offset| + |offset→B| where
 * offset = blocker.pos + normalize(⊥(B−A)) * (blocker.perspace + self.perspace).
 *
 * JS also evaluates the opposite perpendicular and prefers the clearer/shorter side.
 *
 * @file path-point-creature-detour.ts
 */

export type CreatureEdgeDetour = {
  /** Edge traversal cost (detour length). */
  cost: number;
  /** Waypoint to splice between A and B when walking the edge. */
  detour: THREE.Vector3;
  blockerId: number;
};

/**
 * Compute -style detour around a creature blocking A→B.
 */
export function computeCreatureEdgeDetour(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  blocker: ModuleObject,
  owner?: ModuleObject
): CreatureEdgeDetour | undefined {
  if(!blocker?.position) return undefined;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if(len < 1e-6) return undefined;

  const selfSpace = getPathPersonalSpace(owner as ModuleCreature);
  const blockSpace = getPathPersonalSpace(blocker as ModuleCreature)
    || getCreaturePersonalSpace(blocker as ModuleCreature);
  const radius = selfSpace + blockSpace;

  // : perp = normalize(-(By-Ay), Bx-Ax)
  const px = -dy / len;
  const py = dx / len;

  const sides = [
    new THREE.Vector3(
      blocker.position.x + px * radius,
      blocker.position.y + py * radius,
      from.z
    ),
    new THREE.Vector3(
      blocker.position.x - px * radius,
      blocker.position.y - py * radius,
      from.z
    ),
  ];

  let best: CreatureEdgeDetour | undefined;
  let bestScore = Infinity;

  for(let i = 0; i < sides.length; i++){
    let detour = sides[i];
    if(area && typeof area.getNearestWalkablePoint === 'function'){
      detour = area.getNearestWalkablePoint(detour, selfSpace * 0.5);
    }
    const cost =
      Math.hypot(detour.x - from.x, detour.y - from.y) +
      Math.hypot(to.x - detour.x, to.y - detour.y);

    const clear = !area || (
      hasClearWalkLine(area, from, detour, owner) &&
      hasClearWalkLine(area, detour, to, owner)
    );
    const score = cost + (clear ? 0 : 1000);
    if(score < bestScore){
      bestScore = score;
      best = { cost, detour, blockerId: blocker.id };
    }
  }

  return best;
}

/**
 * Pathfind step_tolerance in grid cells — path_find_info field.
 * appearance.2da has no step_tolerance column (perspace/creperspace only);
 * approx from personal_space.
 */
export function getPathStepTolerance(owner?: ModuleObject): number {
  const perspace = getPathPersonalSpace(owner as ModuleCreature);
  return Math.max(2, Math.min(4, Math.round(1.0 / Math.max(0.25, perspace))));
}
