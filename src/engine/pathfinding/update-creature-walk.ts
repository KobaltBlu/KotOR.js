import * as THREE from "three";
import type { ModuleCreature } from "@/module/ModuleCreature";
import {
  DriveUpdateResult,
  updateCreatureDrive,
} from "@/engine/pathfinding/update-creature-drive";
import {
  pathApproachScale,
  walkSpeedFactorRamp,
  walkTrapezoidStep,
  WALK_BACK_DOT,
} from "@/engine/pathfinding/locomotion";
import { noCreaturesOnLine } from "@/engine/pathfinding/no-creatures-on-line";
import { bumpFriends } from "@/engine/pathfinding/bump-friends";
import { plotPathAroundCreature } from "@/engine/pathfinding/plot-path-around-creature";
import { isInUseRange } from "@/actions/use-range";
import { GameState } from "@/GameState";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";

import { isCreature } from "@/module/guards/isCreature";

/**
 * creature walk update.
 *
 * SQRT approach + persistent speed-factor ramp (state) + trapezoidal step,
 * then creature drive update walkable clip / door-cross / NoCreaturesOnLine.
 * Mid-step creature block → BumpFriends / PlotPathAroundCreature (state).
 *
 * @file update-creature-walk.ts
 */

export { DriveUpdateResult as CreatureWalkResult };

const _dest = new THREE.Vector3();
const _probe = new THREE.Vector3();

export interface CreatureWalkOptions {
  /** Remaining path length in world units (total walk distance). */
  remainingDistance?: number;
  /** Allow walk-back facing when short reverse path. */
  allowWalkBack?: boolean;
  /** Extra locomotion scale (FollowLeader bands). */
  followScale?: number;
  /** pathfind state — UseRange early-out target id. */
  useRangeTargetId?: number;
}

/**
 * Advance one frame toward the next path point with accel/trapezoid.
 */
export function updateCreatureWalk(
  creature: ModuleCreature,
  dest: THREE.Vector3,
  running: boolean,
  delta: number,
  options: CreatureWalkOptions = {}
): DriveUpdateResult {
  if(!creature?.area || !dest) return DriveUpdateResult.BLOCKED;

  // walk frame distance UseRange early-out (state)
  if(options.useRangeTargetId != null && options.useRangeTargetId !== 0x7f000000){
    const target = GameState.ModuleObjectManager?.GetObjectById?.(options.useRangeTargetId);
    if(
      target &&
      isCreature(creature) &&
      typeof isInUseRange === 'function' &&
      isInUseRange(creature, target)
    ){
      creature.force = 0;
      creature.speed = 0;
      creature.walk = false;
      creature.setAnimationState?.(ModuleCreatureAnimState.PAUSE);
      return DriveUpdateResult.ARRIVED;
    }
  }

  const walk = creature.getWalkSpeed?.() || 1.7;
  const run = creature.getRunSpeed?.() || 5.4;
  const base = running ? run : walk;
  const remaining =
    typeof options.remainingDistance === 'number'
      ? options.remainingDistance
      : Math.hypot(dest.x - creature.position.x, dest.y - creature.position.y);

  const prev =
    typeof creature.walkSpeedFactor === 'number' && creature.walkSpeedFactor > 0
      ? creature.walkSpeedFactor
      : 0;

  const approach = pathApproachScale(remaining, base, delta);
  const factor = walkSpeedFactorRamp(prev, approach, delta);
  const step = walkTrapezoidStep(prev, factor, base, delta);
  creature.walkSpeedFactor = factor;

  // Scale so updateCreatureDrive's speed*delta ≈ trapezoid step
  const nominal = Math.max(1e-6, base * Math.max(0, delta));
  const trapezoidScale = step / nominal;
  const follow = options.followScale && options.followScale > 0 ? options.followScale : 1;
  const savedScale = creature.locomotionScale;
  creature.locomotionScale = Math.max(0.1, trapezoidScale * follow);

  // Walk-back: keep facing, move toward goal (walk frame distance)
  if(options.allowWalkBack && !running){
    const dx = dest.x - creature.position.x;
    const dy = dest.y - creature.position.y;
    const lenSq = dx * dx + dy * dy;
    if(lenSq > 1e-8 && lenSq < 4.0){
      const len = Math.sqrt(lenSq);
      const gx = dx / len;
      const gy = dy / len;
      const fx = Math.cos(creature.rotation.z + Math.PI / 2);
      const fy = Math.sin(creature.rotation.z + Math.PI / 2);
      if(fx * gx + fy * gy < WALK_BACK_DOT){
        creature.moveDirOverride = { x: gx, y: gy };
      }
    }
  }

  // walk step distance test: test the actual frame step, then
  // BumpFriends; on fail state < 6 → PlotPathAroundCreature.
  const toX = dest.x - creature.position.x;
  const toY = dest.y - creature.position.y;
  const toLen = Math.hypot(toX, toY);
  if(toLen > 1e-8){
    const probeLen = Math.min(toLen, step * follow);
    _probe.set(
      creature.position.x + (toX / toLen) * probeLen,
      creature.position.y + (toY / toLen) * probeLen,
      creature.position.z
    );
    const creatures = noCreaturesOnLine(
      creature.area,
      creature.position,
      _probe,
      { owner: creature, allowPartyCreatures: false }
    );
    if(!creatures.clear && creatures.blockingCreatureId != null){
      if(
        options.useRangeTargetId != null &&
        options.useRangeTargetId !== 0x7f000000 &&
        creatures.blockingCreatureId === options.useRangeTargetId
      ){
        // walk frame distance stops when the intended use target
        // itself blocks the final approach; do not shove or hex around it.
        creature.setComputedPath?.(undefined);
        creature.pathBlockFailCount = 0;
        creature.walkSpeedFactor = 0;
        creature.setAnimationState?.(ModuleCreatureAnimState.PAUSE);
        creature.locomotionScale = savedScale;
        return DriveUpdateResult.ARRIVED;
      }

      const blocker =
        creature.area.creatures?.find((c) => c.id === creatures.blockingCreatureId) ??
        GameState.PartyManager?.party?.find((c) => c.id === creatures.blockingCreatureId);
      if(isCreature(blocker)){
        const bumped = bumpFriends(
          creature,
          blocker as ModuleCreature,
          _probe,
          creature.position
        );
        if(bumped){
          creature.pathBlockFailCount = 0;
        }else{
          const fails = (creature.pathBlockFailCount | 0) + 1;
          creature.pathBlockFailCount = fails;
          if(fails < 6){
            const hex = plotPathAroundCreature(creature, blocker as ModuleCreature);
            if(hex.spliced){
              creature.pathBlockFailCount = 0;
              creature.locomotionScale = savedScale;
              return DriveUpdateResult.BLOCKED;
            }
            // PlotPathAroundCreature return 0 → PauseReady + ResetAtEndOfPath
            // via walk frame distance return-1 / ARRIVED.
            // Clearing here drops a poisoned path (e.g. FindEntryAndExit miss) so
            // ActionMoveToPoint replots instead of walking a stale far waypoint.
            creature.setComputedPath?.(undefined);
            creature.setAnimationState?.(ModuleCreatureAnimState.PAUSE);
            creature.locomotionScale = savedScale;
            creature.blockingTimer = (creature.blockingTimer || 0) + 1;
            return DriveUpdateResult.BLOCKED;
          }else{
            // : clear path / pause after 6 fails
            creature.setComputedPath?.(undefined);
            creature.pathBlockFailCount = 0;
            creature.walkSpeedFactor = 0;
            creature.setAnimationState?.(ModuleCreatureAnimState.PAUSE);
            creature.locomotionScale = savedScale;
            return DriveUpdateResult.BLOCKED;
          }
        }
      }
    }else{
      creature.pathBlockFailCount = 0;
    }
  }

  _dest.copy(dest);
  const result = updateCreatureDrive(creature, _dest, running, delta);

  creature.locomotionScale = savedScale;
  if(result === DriveUpdateResult.BLOCKED){
    // Discrete path-block count only — collisionTimer seconds owned by CollisionManager
    creature.blockingTimer = (creature.blockingTimer || 0) + 1;
  }else{
    creature.blockingTimer = Math.max(0, (creature.blockingTimer || 0) - 1);
  }
  return result;
}

/** Reset persistent WalkUpdate state when pathing ends. */
export function resetWalkSpeedFactor(creature: ModuleCreature): void {
  if(creature) creature.walkSpeedFactor = 0;
}
