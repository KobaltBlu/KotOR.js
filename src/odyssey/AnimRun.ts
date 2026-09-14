import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import { AuroraAnimationFlag } from "@/enums/animation/AuroraAnimationFlag";
import type { OdysseyModelAnimationManagerState } from "@/enums/odyssey/OdysseyModelAnimationManagerState";

/**
 * Max concurrent AnimRuns per Gob.
 * Retail uses a dynamic CExoArrayList; 8 is the intentional JS bound
 * (matches prior MVP capacity; no hard retail max found).
 */
export const ANIM_RUN_STACK_CAP = 8;

/** Fallback when MDL transition is 0 but a base replace needs a crossfade. */
export const ANIM_RUN_DEFAULT_TRANSITION = 0;

/**
 * Aurora AnimRun (~0x24) — one clip instance on a Gob stack.
 * Retail layout: animation*, speed, flags, prevTime, curTime, weight,
 * transition, scale, deactivated.
 */
export interface AnimRun {
  animation: OdysseyModelAnimation;
  /** Compatibility playback state (elapsed, loop, speed, events, 2DA row). */
  state: OdysseyModelAnimationManagerState;
  flags: number;
  /** Blend weight 0→1 (fade in/out). */
  weight: number;
  /** Seconds for weight ramp; from MDL `transition`. */
  transition: number;
  /** Weight ramping down after finish / stop. */
  fadingOut: boolean;
  /** Pending removal after fade or fire-forget. */
  done: boolean;
  /**
   * Deferred start (flags & QUEUE). Frozen until promote clears QUEUE.
   * Mirrors retail Animate skipping runs with 0x20 set.
   */
  queued: boolean;
}

export function isOverlayRun(run: AnimRun): boolean {
  return (
    !!(run.flags & AuroraAnimationFlag.OVERLAY_SLOT) ||
    !!(run.flags & AuroraAnimationFlag.ADDITIVE_GESTURE)
  );
}

export function isAdditiveRun(run: AnimRun): boolean {
  return !!(run.flags & AuroraAnimationFlag.ADDITIVE_GESTURE);
}

export function isLoopingRun(run: AnimRun): boolean {
  return !!(run.flags & AuroraAnimationFlag.LOOPING) || !!run.state.loop;
}

export function isQueuedRun(run: AnimRun): boolean {
  return run.queued || !!(run.flags & AuroraAnimationFlag.QUEUE);
}

export function createAnimRun(
  animation: OdysseyModelAnimation,
  flags: number = 0,
  state?: Partial<OdysseyModelAnimationManagerState>
): AnimRun {
  const transition =
    animation && animation.transition > 0
      ? animation.transition
      : ANIM_RUN_DEFAULT_TRANSITION;
  const queued = !!(flags & AuroraAnimationFlag.QUEUE);
  // Queued runs stay at weight 0 until promoted (retail does not pose them).
  const immediate = !queued && !(transition > 0);
  return {
    animation,
    state: {
      loop: !!(flags & AuroraAnimationFlag.LOOPING) || !!state?.loop,
      cFrame: state?.cFrame ?? 0,
      elapsed: state?.elapsed ?? 0,
      elapsedCount: state?.elapsedCount ?? 0,
      lastTime: state?.lastTime ?? 0,
      delta: state?.delta ?? 0,
      lastEvent: state?.lastEvent ?? -1,
      events: state?.events ? state.events.slice() : [],
      animation: state?.animation,
      speed: typeof state?.speed === "number" ? state.speed : 1,
    },
    flags,
    weight: immediate ? 1 : 0,
    transition,
    fadingOut: false,
    done: false,
    queued,
  };
}
