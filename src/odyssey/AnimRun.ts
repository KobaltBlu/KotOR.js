import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import { AuroraAnimationFlag } from "@/enums/animation/AuroraAnimationFlag";
import type { OdysseyModelAnimationManagerState } from "@/enums/odyssey/OdysseyModelAnimationManagerState";

/** Max concurrent AnimRuns per Gob (MVP cap). */
export const ANIM_RUN_STACK_CAP = 8;

/** Fallback when MDL transition is 0 but a base replace needs a crossfade. */
export const ANIM_RUN_DEFAULT_TRANSITION = 0;

/**
 * Retail Aurora AnimRun (~0x24) — one clip instance on a Gob stack.
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

export function createAnimRun(
  animation: OdysseyModelAnimation,
  flags: number = 0,
  state?: Partial<OdysseyModelAnimationManagerState>
): AnimRun {
  const transition =
    animation && animation.transition > 0
      ? animation.transition
      : ANIM_RUN_DEFAULT_TRANSITION;
  const immediate = !(transition > 0);
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
  };
}
