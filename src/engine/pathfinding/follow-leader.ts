/**
 * Party follow state helpers — subset of retail
 * WalkUpdateLocation_QuickWalk_FollowLeader @ 0051c360.
 *
 * Retail uses an 11-state SM on party-member follow data + a ring buffer of
 * leader path points. JS approximates the gameplay-critical thresholds:
 *   - Hysteresis around lateral follow offset (stop thrash)
 *   - Run vs walk by distance to leader / offset
 *   - Teleport when very far or stuck between Move hops
 *   - Rate bands via getFollowRateScale (locomotion.ts)
 *
 * @file follow-leader.ts
 */

export {
  getFollowRateScale,
} from "@/engine/pathfinding/locomotion";

/** Idle when within this of the follow offset (world units). */
export const FOLLOW_COMFORT = 2.0;
/** Begin / continue MoveTo when farther than this from offset. */
export const FOLLOW_REPATH = 3.5;
/** Retail local_44 >= 16 → dist >= 4 to offset goal uses run. */
export const FOLLOW_RUN_DIST = 4.0;
/** Retail local_44 >= 225 → dist 15; beyond this we teleport forward. */
export const FOLLOW_TELEPORT_DIST = 15.0;
/** Seconds of failed/short Move hops while Moving → teleport. */
export const FOLLOW_STUCK_SEC = 2.5;

export enum FollowLeaderState {
  Idle = 0,
  MovingToOffset = 1,
  Teleport = 2,
}

export type FollowLeaderRuntime = {
  state: FollowLeaderState;
  stuckTimer: number;
};

export function createFollowRuntime(): FollowLeaderRuntime {
  return {
    state: FollowLeaderState.Idle,
    stuckTimer: 0,
  };
}

/**
 * Distance-based run flag (retail scales rate by dist² bands).
 */
export function shouldFollowRun(
  distToLeader: number,
  distToOffset: number
): boolean {
  return distToLeader >= FOLLOW_RUN_DIST || distToOffset >= FOLLOW_RUN_DIST;
}

/**
 * Decide next follow state from distances and stuck timer.
 */
export function resolveFollowState(
  distToLeader: number,
  distToOffset: number,
  current: FollowLeaderState,
  stuckTimer: number
): FollowLeaderState {
  if(distToLeader >= FOLLOW_TELEPORT_DIST || stuckTimer >= FOLLOW_STUCK_SEC){
    return FollowLeaderState.Teleport;
  }

  if(current === FollowLeaderState.MovingToOffset){
    // Hysteresis: keep moving until comfort
    if(distToOffset <= FOLLOW_COMFORT){
      return FollowLeaderState.Idle;
    }
    return FollowLeaderState.MovingToOffset;
  }

  // Idle → move only past repath threshold
  if(distToOffset >= FOLLOW_REPATH || distToLeader >= FOLLOW_REPATH + 1.5){
    return FollowLeaderState.MovingToOffset;
  }
  return FollowLeaderState.Idle;
}
