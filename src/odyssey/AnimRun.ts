import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import { AuroraAnimationFlag } from "@/enums/animation/AuroraAnimationFlag";
import type { OdysseyModelAnimationManagerState } from "@/enums/odyssey/OdysseyModelAnimationManagerState";
import type { BoundAnimation } from "@/odyssey/BoundAnimation";

/**
 * Max concurrent AnimRuns per model (intentional JS stack cap).
 */
export const ANIM_RUN_STACK_CAP = 8;

/** Fallback when MDL transition is 0 but a base replace needs a crossfade. */
export const ANIM_RUN_DEFAULT_TRANSITION = 0;

/**
 * One clip instance on a model's animation stack: animation, speed, flags,
 * timing, blend weight, transition, and fade/done state.
 *
 * Frame cursors are per-run playback state, never stored on shared
 * OdysseyController assets. Prefer BoundAnimation Int32Array cursors when
 * bound; otherwise a Map keyed by controller.
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
   */
  queued: boolean;
  /**
   * Per-controller keyframe cursors for this run only.
   * Lazy-allocated on first sample. Prefer frameCursorArray when bound.
   */
  frameCursors?: Map<OdysseyController, number>;
  /**
   * BoundAnimation Int32Array cursors, indexed by BoundController.cursorIndex.
   * When set, preferred over frameCursors Map.
   */
  frameCursorArray?: Int32Array;
  /** BoundAnimation used to size/index frameCursorArray. */
  boundAnimation?: BoundAnimation;
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

/** Clear keyframe cursors after an explicit elapsed seek/reset/reuse. */
export function invalidateAnimRunFrameCursors(run: AnimRun): void {
  if(run.frameCursors){
    run.frameCursors.clear();
  }
  if(run.frameCursorArray){
    run.frameCursorArray.fill(0);
  }
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
  // Queued runs stay at weight 0 until promoted (not posed while queued).
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
