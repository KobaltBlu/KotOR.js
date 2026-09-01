import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { getCreaturePersonalSpace } from "@/combat/attack-range";
import { GameState } from "@/GameState";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { evaluateOverlappingTargets } from "@/engine/pathfinding/evaluate-overlapping-targets";
import { getIsCreatureBumpable } from "@/engine/pathfinding/get-is-creature-bumpable";
import {
  setHitInfoForCreature,
  type WalkHitInfo,
} from "@/engine/pathfinding/walk-hit-info";

/**
 * Approximate NoCreaturesOnLine.
 *
 * Retail: cre_personal_space(+0.01) capsule along the segment; returns 0 and
 * writes blocker object id when a living bumpable creature overlaps.
 * EvaluateOverlappingTargets soft-clears start-overlap / soft-pair stacks.
 * Optional CWalkHitInfo via SetHitInfoForCreature.
 *
 * @file no-creatures-on-line.ts
 */

export type NoCreaturesOnLineResult = {
  /** true = clear (retail return 1). */
  clear: boolean;
  /** Blocker id when clear=false (retail *arg6). */
  blockingCreatureId?: number;
};

/**
 * Distance from point P to segment AB in 2D.
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

function isPartyCreature(creature: ModuleObject): boolean {
  const party = GameState.PartyManager?.party;
  if(!party?.length) return false;
  return party.indexOf(creature as ModuleCreature) >= 0;
}

/**
 * Test whether any creature's creperspace capsule intersects the segment.
 * Mirrors retail return: clear=1 / blocked=0 + blocker id.
 */
export function noCreaturesOnLine(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: {
    owner?: ModuleObject;
    /** Self cre_personal_space (retail arg3->cre_personal_space + 0.01). */
    crePersonalSpace?: number;
    ignoreCreatureIds?: number[];
    allowPartyCreatures?: boolean;
    /** Soft-pair for EvaluateOverlappingTargets (retail pathfind state). */
    softCreature?: ModuleObject;
    /**
     * When true, skip creatures where GetIsCreatureBumpable(owner, other)
     * (retail NoCreatures arg5 gate — rarely set by callers).
     */
    skipBumpable?: boolean;
    /** Optional retail CWalkHitInfo out-param. */
    hit?: WalkHitInfo;
  } = {}
): NoCreaturesOnLineResult {
  if(!area) return { clear: true };
  if(from.distanceToSquared(to) < 1e-10) return { clear: true };

  const ownerId = options.owner?.id;
  const selfSpace = (options.crePersonalSpace
    ?? getCreaturePersonalSpace(options.owner as ModuleCreature)) + 0.01;
  const ignore = options.ignoreCreatureIds;
  const allowParty = options.allowPartyCreatures === true;
  const skipBumpable = options.skipBumpable === true;

  const candidates: ModuleCreature[] = [];
  if(area.creatures?.length){
    for(let i = 0; i < area.creatures.length; i++){
      const c = area.creatures[i];
      if(c) candidates.push(c);
    }
  }
  const party = GameState.PartyManager?.party;
  if(party?.length){
    for(let i = 0; i < party.length; i++){
      const c = party[i];
      if(c && candidates.indexOf(c) < 0) candidates.push(c);
    }
  }

  // Expand AABB slightly (retail uses ±6 on X index range)
  const minX = Math.min(from.x, to.x) - 6;
  const maxX = Math.max(from.x, to.x) + 6;
  const minY = Math.min(from.y, to.y) - 6;
  const maxY = Math.max(from.y, to.y) + 6;

  for(let i = 0; i < candidates.length; i++){
    const creature = candidates[i];
    if(!creature || creature.id === ownerId) continue;
    if(ignore?.length && ignore.indexOf(creature.id) >= 0) continue;
    if(!BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature)) continue;
    if(creature.isDead?.()) continue;
    if(allowParty && isPartyCreature(creature)) continue;
    if(
      skipBumpable &&
      options.owner &&
      getIsCreatureBumpable(options.owner as ModuleCreature, creature)
    ){
      continue;
    }

    const px = creature.position.x;
    const py = creature.position.y;
    if(px < minX || px > maxX || py < minY || py > maxY) continue;

    const radius = getCreaturePersonalSpace(creature) + selfSpace;
    const dist = distPointToSegment2D(px, py, from.x, from.y, to.x, to.y);
    if(dist < radius){
      const soft = evaluateOverlappingTargets(
        creature.position, from, radius,
        { owner: options.owner, softCreature: options.softCreature }
      );
      if(soft.allow) continue;
      if(options.hit){
        setHitInfoForCreature(
          creature.position, radius, from, to, options.hit
        );
        options.hit.objectId = creature.id;
      }
      return { clear: false, blockingCreatureId: creature.id };
    }
  }

  return { clear: true };
}
