/**
 * Party follow state helpers — WalkUpdateLocation_QuickWalk_FollowLeader @ 0051c360.
 *
 * Retail uses an 11-state SM on party-member follow data + a ring buffer of
 * leader path points. KotOR.js ports those states and drives them from
 * ActionFollowLeader; ForceFollow uses Offset / MovingToOffset / Teleport only.
 *
 * @file follow-leader.ts
 */

export {
  getFollowRateScale,
} from "@/engine/pathfinding/locomotion";

/** Idle / comfort when within this of the follow offset (world units). */
export const FOLLOW_COMFORT = 2.0;
/** Begin / continue approach when farther than this from offset. */
export const FOLLOW_REPATH = 3.5;
/** Retail local_44 >= 16 → dist >= 4 to offset goal uses run. */
export const FOLLOW_RUN_DIST = 4.0;
/** Retail local_44 >= 225 → dist 15; beyond this we teleport forward. */
export const FOLLOW_TELEPORT_DIST = 15.0;
/** Seconds of failed/short hops while Moving → teleport. */
export const FOLLOW_STUCK_SEC = 2.5;
/** Retail field11_0x44 abort → Reset after 50 inner iterations. */
export const FOLLOW_STUCK_ITERATIONS = 50;

/**
 * Retail party-member field1_0x4 cases from
 * WalkUpdateLocation_QuickWalk_FollowLeader @ 0051c360.
 */
export enum FollowLeaderState {
  Reset = -1,
  FindPath = 0,
  Offset = 1,
  /** Alias — parked near goal (ForceFollow / comfort). */
  Idle = 1,
  MovingToPath = 2,
  FollowingPath = 3,
  MovingToOffset = 4,
  WaitingForPath = 5,
  OffsetWaitDest = 6,
  PathWaitDest = 7,
  ToOffsetWaitDest = 8,
  ToPathWaitDest = 9,
  Teleport = 10,
}

export type FollowLeaderRuntime = {
  state: FollowLeaderState;
  /** Seconds of failed progress while approaching (JS stuck timer). */
  stuckTimer: number;
  /** Retail field11_0x44 — inner SM iterations; Reset after FOLLOW_STUCK_ITERATIONS. */
  stuckCounter: number;
  /** Frames spent in a WaitDest hold before advancing. */
  waitFrames: number;
  /** Last sampled follower position (retail field17–19). */
  lastSampleX: number;
  lastSampleY: number;
  lastSampleZ: number;
  /** Cached ring goal (retail field8 / Recalc center). */
  goalX: number;
  goalY: number;
  goalZ: number;
  /** Cached path-entry point (retail field6). */
  pathPointX: number;
  pathPointY: number;
  pathPointZ: number;
};

export function createFollowRuntime(): FollowLeaderRuntime {
  return {
    state: FollowLeaderState.WaitingForPath,
    stuckTimer: 0,
    stuckCounter: 0,
    waitFrames: 0,
    lastSampleX: 0,
    lastSampleY: 0,
    lastSampleZ: 0,
    goalX: 0,
    goalY: 0,
    goalZ: 0,
    pathPointX: 0,
    pathPointY: 0,
    pathPointZ: 0,
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

export function isFollowMovingState(state: FollowLeaderState): boolean {
  return (
    state === FollowLeaderState.MovingToPath ||
    state === FollowLeaderState.FollowingPath ||
    state === FollowLeaderState.MovingToOffset ||
    state === FollowLeaderState.FindPath
  );
}

export function isFollowWaitState(state: FollowLeaderState): boolean {
  return (
    state === FollowLeaderState.WaitingForPath ||
    state === FollowLeaderState.OffsetWaitDest ||
    state === FollowLeaderState.PathWaitDest ||
    state === FollowLeaderState.ToOffsetWaitDest ||
    state === FollowLeaderState.ToPathWaitDest
  );
}

/**
 * High-level entry: far/stuck → Teleport; else keep or enter approach states.
 * Detailed transitions happen inside stepFollowLeaderState.
 */
export function resolveFollowEntryState(
  distToLeader: number,
  distToOffset: number,
  current: FollowLeaderState,
  stuckTimer: number
): FollowLeaderState {
  if(distToLeader >= FOLLOW_TELEPORT_DIST || stuckTimer >= FOLLOW_STUCK_SEC){
    return FollowLeaderState.Teleport;
  }

  if(current === FollowLeaderState.Reset){
    return FollowLeaderState.WaitingForPath;
  }

  if(isFollowMovingState(current) || isFollowWaitState(current) || current === FollowLeaderState.Teleport){
    return current;
  }

  // Offset / Idle: leave comfort only past repath
  if(distToOffset <= FOLLOW_COMFORT){
    return FollowLeaderState.Offset;
  }
  if(distToOffset >= FOLLOW_REPATH || distToLeader >= FOLLOW_REPATH + 1.5){
    return FollowLeaderState.FindPath;
  }
  return FollowLeaderState.Offset;
}

/**
 * Legacy 3-state resolver used by ForceFollow (Offset / MovingToOffset / Teleport).
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

  const moving =
    current === FollowLeaderState.MovingToOffset ||
    current === FollowLeaderState.MovingToPath ||
    current === FollowLeaderState.FollowingPath;

  if(moving){
    if(distToOffset <= FOLLOW_COMFORT){
      return FollowLeaderState.Offset;
    }
    return FollowLeaderState.MovingToOffset;
  }

  if(distToOffset >= FOLLOW_REPATH || distToLeader >= FOLLOW_REPATH + 1.5){
    return FollowLeaderState.MovingToOffset;
  }
  return FollowLeaderState.Offset;
}
