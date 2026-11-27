/**
 * Party follow state helpers — follow-leader creature loco.
 *
 * uses an 11-state SM on party-member follow data + a ring buffer of
 * leader path points. KotOR.js ports those states and drives them from
 * ActionFollowLeader; ForceFollow uses Offset / MovingToOffset / Teleport only.
 *
 * @file party-follow.ts
 */

export {
  getFollowRateScale,
} from "@engine/pathfinding/locomotion";

/** Idle / comfort when within this of the follow offset (world units). */
export const FOLLOW_COMFORT = 2.0;
/** Begin / continue approach when farther than this from offset. */
export const FOLLOW_REPATH = 3.5;
/** : dist >= 4 to offset goal uses run. */
export const FOLLOW_RUN_DIST = 4.0;
/** Drop run only below this after having been running (hysteresis). */
export const FOLLOW_RUN_DROP = 3.0;
/** : dist 15; beyond this we teleport forward. */
export const FOLLOW_TELEPORT_DIST = 15.0;
/** Seconds of failed/short hops while Moving → teleport. */
export const FOLLOW_STUCK_SEC = 2.5;
/** Abort → Reset after 50 inner iterations. */
export const FOLLOW_STUCK_ITERATIONS = 50;
/**
 * WaitingForPath — hold until follow ring count > 4.
 */
export const FOLLOW_RING_WARM_COUNT = 4;
/**
 * safety gate: chase only when not in-safety OR
 * leader distance² ≥ 49 (dist ≥ 7).
 */
export const FOLLOW_SAFETY_DIST_SQ = 49.0;

/**
 * party-member follow SM states from
 * follow-leader creature loco.
 */
export enum PartyFollowState {
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

export type PartyFollowRuntime = {
  state: PartyFollowState;
  /** Seconds of failed progress while approaching (JS stuck timer). */
  stuckTimer: number;
  /** Inner SM iterations; Reset after FOLLOW_STUCK_ITERATIONS. */
  stuckCounter: number;
  /** Frames spent in a WaitDest hold before advancing. */
  waitFrames: number;
  /** Last sampled follower position. */
  lastSampleX: number;
  lastSampleY: number;
  lastSampleZ: number;
  /** Cached ring goal (Recalc center). */
  goalX: number;
  goalY: number;
  goalZ: number;
  /** Cached path-entry point. */
  pathPointX: number;
  pathPointY: number;
  pathPointZ: number;
  /**
   * FollowInfo.InSafetyRange —
   * when set, WaitingForPath holds until leader is ≥7 units away.
   */
  inSafetyRange: number;
  /** Run/walk hysteresis latch for shouldFollowRun. */
  wasRunning: boolean;
  /** True when Offset Advanced along the trail this frame (don't parkIdle). */
  offsetStepped: boolean;
  /**
   * Seconds of consecutive Offset frames with no Advance step.
   * Used so parkIdleSoft does not thrash AnimRun run↔pause mid-transition.
   */
  offsetIdleTime: number;
};

export function createFollowRuntime(): PartyFollowRuntime {
  return {
    state: PartyFollowState.WaitingForPath,
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
    inSafetyRange: 0,
    wasRunning: false,
    offsetStepped: false,
    offsetIdleTime: 0,
  };
}

/**
 * Distance-based run flag with hysteresis (enter ≥4, leave <3).
 */
export function shouldFollowRun(
  distToLeader: number,
  distToOffset: number,
  wasRunning: boolean = false
): boolean {
  const enter = distToLeader >= FOLLOW_RUN_DIST || distToOffset >= FOLLOW_RUN_DIST;
  if(enter) return true;
  if(wasRunning){
    return distToLeader >= FOLLOW_RUN_DROP || distToOffset >= FOLLOW_RUN_DROP;
  }
  return false;
}

export function isFollowMovingState(state: PartyFollowState): boolean {
  return (
    state === PartyFollowState.MovingToPath ||
    state === PartyFollowState.FollowingPath ||
    state === PartyFollowState.MovingToOffset ||
    state === PartyFollowState.FindPath
  );
}

export function isFollowWaitState(state: PartyFollowState): boolean {
  return (
    state === PartyFollowState.WaitingForPath ||
    state === PartyFollowState.OffsetWaitDest ||
    state === PartyFollowState.PathWaitDest ||
    state === PartyFollowState.ToOffsetWaitDest ||
    state === PartyFollowState.ToPathWaitDest
  );
}

/**
 * High-level entry: far/stuck → Teleport; else keep or enter approach states.
 * Detailed transitions happen inside stepPartyFollowState.
 *
 * Teleport (10) is ring soft-catch-up (TeleportForward → MovingToPath),
 * not JumpToPoint. Do not force Teleport while the follow ring is still cold
 * Jump fallback would target feet (cold GetFollowPosition) and spam.
 */
export function resolveFollowEntryState(
  distToLeader: number,
  distToOffset: number,
  current: PartyFollowState,
  stuckTimer: number,
  ringCount: number = 99
): PartyFollowState {
  if(stuckTimer >= FOLLOW_STUCK_SEC){
    return PartyFollowState.Teleport;
  }

  if(distToLeader >= FOLLOW_TELEPORT_DIST){
    // Need a warm ring for TeleportForward; otherwise hold/wait
    if(ringCount > FOLLOW_RING_WARM_COUNT){
      return PartyFollowState.Teleport;
    }
    if(isFollowWaitState(current) || current === PartyFollowState.Reset){
      return current === PartyFollowState.Reset
        ? PartyFollowState.WaitingForPath
        : current;
    }
    return PartyFollowState.WaitingForPath;
  }

  if(current === PartyFollowState.Reset){
    return PartyFollowState.WaitingForPath;
  }

  if(isFollowMovingState(current) || isFollowWaitState(current) || current === PartyFollowState.Teleport){
    return current;
  }

  // Offset / Idle: leave comfort only past repath
  if(distToOffset <= FOLLOW_COMFORT){
    return PartyFollowState.Offset;
  }
  if(distToOffset >= FOLLOW_REPATH || distToLeader >= FOLLOW_REPATH + 1.5){
    return PartyFollowState.FindPath;
  }
  return PartyFollowState.Offset;
}

/**
 * Legacy 3-state resolver used by ForceFollow (Offset / MovingToOffset / Teleport).
 */
export function resolveFollowState(
  distToLeader: number,
  distToOffset: number,
  current: PartyFollowState,
  stuckTimer: number
): PartyFollowState {
  if(distToLeader >= FOLLOW_TELEPORT_DIST || stuckTimer >= FOLLOW_STUCK_SEC){
    return PartyFollowState.Teleport;
  }

  const moving =
    current === PartyFollowState.MovingToOffset ||
    current === PartyFollowState.MovingToPath ||
    current === PartyFollowState.FollowingPath;

  if(moving){
    if(distToOffset <= FOLLOW_COMFORT){
      return PartyFollowState.Offset;
    }
    return PartyFollowState.MovingToOffset;
  }

  if(distToOffset >= FOLLOW_REPATH || distToLeader >= FOLLOW_REPATH + 1.5){
    return PartyFollowState.MovingToOffset;
  }
  return PartyFollowState.Offset;
}
