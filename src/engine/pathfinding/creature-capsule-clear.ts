import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";
import { getCreaturePersonalSpace } from "@engine/combat/attack-range";
import { GameState } from "@engine/runtime/GameState";
import { resolveStartOverlapCreatures } from "@engine/pathfinding/start-overlap-creatures";
import { isCreatureNudgeable } from "@engine/pathfinding/is-creature-nudgeable";
import { isCreature } from "@engine/module/guards/isCreature";
import {
  setHitInfoForCreature,
  type WalkHitInfo,
} from "@engine/pathfinding/walk-hit-info";

/**
 * Creature capsule intersection along a walk segment.
 *
 * Inflates each creature's personal space by +0.01 along the segment; returns
 * blocked plus blocker id when a living bumpable creature overlaps.
 * resolveStartOverlapCreatures soft-clears start-overlap / soft-pair stacks.
 * Optional WalkHitInfo via setHitInfoForCreature.
 */

export type CreatureCapsuleClearResult = {
  /** True when the segment is creature-clear. */
  clear: boolean;
  /** Blocker id when clear is false. */
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

function isPartyCreature(creature: GameObject): boolean {
  const party = GameState.PartyManager?.party;
  if(!party?.length) return false;
  return party.indexOf(creature as Creature) >= 0;
}

/**
 * Test whether any creature's personal-space capsule intersects the segment.
 * Returns clear=true when open, or clear=false with blockingCreatureId.
 */
export function isCreatureCapsuleClear(
  area: Area | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: {
    owner?: GameObject;
    /** Self personal space before the +0.01 inflate. */
    crePersonalSpace?: number;
    ignoreCreatureIds?: number[];
    allowPartyCreatures?: boolean;
    /** Soft-pair creature for resolveStartOverlapCreatures. */
    softCreature?: GameObject;
    /**
     * When true, skip creatures where isCreatureNudgeable(owner, other)
     * (rarely set by callers).
     */
    skipBumpable?: boolean;
    /**
     * When true (default), resolveStartOverlapCreatures soft-clears creatures
     * already overlapping the segment start (walk/path splicing).
     * Jump / findOpenWalkLocation set false so occupied cells hard-block.
     */
    softClearStartOverlap?: boolean;
    /** Optional walk-hit out-param. */
    hit?: WalkHitInfo;
  } = {}
): CreatureCapsuleClearResult {
  if(!area) return { clear: true };
  if(from.distanceToSquared(to) < 1e-10) return { clear: true };

  const ownerId = options.owner?.id;
  const selfSpace = (options.crePersonalSpace
    ?? getCreaturePersonalSpace(options.owner as Creature)) + 0.01;
  const ignore = options.ignoreCreatureIds;
  const allowParty = options.allowPartyCreatures === true;
  const skipBumpable = options.skipBumpable === true;
  const softClearStart = options.softClearStartOverlap !== false;

  const candidates: Creature[] = [];
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

  // Broad-phase AABB pad (±6 world units)
  const minX = Math.min(from.x, to.x) - 6;
  const maxX = Math.max(from.x, to.x) + 6;
  const minY = Math.min(from.y, to.y) - 6;
  const maxY = Math.max(from.y, to.y) + 6;

  for(let i = 0; i < candidates.length; i++){
    const creature = candidates[i];
    if(!creature || creature.id === ownerId) continue;
    if(ignore?.length && ignore.indexOf(creature.id) >= 0) continue;
    if(!isCreature(creature)) continue;
    if(creature.isDead?.()) continue;
    if(allowParty && isPartyCreature(creature)) continue;
    if(
      skipBumpable &&
      options.owner &&
      isCreatureNudgeable(options.owner as Creature, creature)
    ){
      continue;
    }

    const px = creature.position.x;
    const py = creature.position.y;
    if(px < minX || px > maxX || py < minY || py > maxY) continue;

    const radius = getCreaturePersonalSpace(creature) + selfSpace;
    const dist = distPointToSegment2D(px, py, from.x, from.y, to.x, to.y);
    if(dist < radius){
      if(softClearStart){
        const soft = resolveStartOverlapCreatures(
          creature.position, from, radius,
          {
            owner: options.owner,
            softCreature: options.softCreature,
            // Directional soft-clear: escape/outward ok, dig-deeper/tunnel blocked.
            lineEnd: to,
          }
        );
        if(soft.allow) continue;
      }
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
