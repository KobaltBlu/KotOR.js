import { AnimationPlaybackMode } from "@/enums/animation/AnimationPlaybackMode";

/**
 * Playback classification for SetAnimation routing.
 * K1 encodes overlay/reverse decisions as an explicit switch; these sets
 * capture that switch so callers can resolve mode without duplicating the lists.
 */

/** Server IDs routed to overlay playback. */
export const SET_ANIMATION_OVERLAY_IDS: ReadonlySet<number> = new Set([
  0x272d, 0x272e, 0x2732,
  0x2736, 0x2737, 0x2738, 0x2739, 0x273a,
  0x2756, 0x2757,
  0x2791, 0x2792,
  0x2798,
  0x27aa, 0x27ab,
  0x283e,
]);

/**
 * Server IDs that negate playback speed (reverse base).
 * Includes special 0x2810 (10256).
 */
export const SET_ANIMATION_REVERSE_IDS: ReadonlySet<number> = new Set([
  0x2713, 0x2761, 0x2763,
  0x27e4, 0x27fe, 0x2810, 0x2812, 0x281f,
]);

/**
 * Overlay stop uses additive-gesture fade (0x400) for these IDs; otherwise 0x80.
 */
export const OVERLAY_STOP_ADDITIVE_IDS: ReadonlySet<number> = new Set([
  0x272d, 0x272e, 0x2732,
  0x2736, 0x2737, 0x2738, 0x2739, 0x273a,
  0x2756, 0x2757,
  0x2798, 0x27a1,
  0x27aa, 0x27ab,
]);

/**
 * Overlay start skips FIRE_FORGET (0x001) for these IDs.
 * Start flags = 0x08, optionally | 0x001.
 */
export const OVERLAY_START_NO_FIRE_FORGET_IDS: ReadonlySet<number> = new Set([
  0x175,
  0x272e,
  0x2736, 0x2737, 0x2738, 0x2739, 0x273a,
  0x27aa, 0x27ab,
]);

export function resolveModeFromAnimationIdSets(serverId: number): AnimationPlaybackMode {
  const id = serverId & 0xffff;
  if(SET_ANIMATION_REVERSE_IDS.has(id)){
    return AnimationPlaybackMode.REVERSE;
  }
  if(SET_ANIMATION_OVERLAY_IDS.has(id)){
    return AnimationPlaybackMode.OVERLAY;
  }
  return AnimationPlaybackMode.NORMAL;
}
