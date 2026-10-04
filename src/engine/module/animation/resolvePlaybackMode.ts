import { AnimationPlaybackMode } from "@core/enums/animation/AnimationPlaybackMode";
import type { SWAnimation } from "@engine/rules/SWAnimation";
import { isAnimation2DAFlagSet } from "@engine/module/animation/animation2daFlag";
import {
  OVERLAY_START_NO_FIRE_FORGET_IDS,
  OVERLAY_STOP_ADDITIVE_IDS,
  resolveModeFromAnimationIdSets,
  SET_ANIMATION_OVERLAY_IDS,
} from "@engine/module/animation/setAnimationModeTables";

/**
 * Reverse-mode special server ID (10256 / 0x2810).
 * Also covered by SET_ANIMATION_REVERSE_IDS; kept for callers/tests.
 */
export const ANIMATION_REVERSE_SERVER_ID = 10256;

/**
 * Resolve SetAnimation playback mode for a creature server animation ID.
 * Prefer the overlay/reverse ID sets; animations.2da `overlay` remains a
 * fallback for IDs outside those sets.
 */
export function resolvePlaybackMode(
  serverId: number,
  twoDA?: SWAnimation | null
): AnimationPlaybackMode {
  const fromTables = resolveModeFromAnimationIdSets(serverId);
  if(fromTables !== AnimationPlaybackMode.NORMAL){
    return fromTables;
  }

  if(twoDA && isAnimation2DAFlagSet(twoDA.overlay)){
    return AnimationPlaybackMode.OVERLAY;
  }

  return AnimationPlaybackMode.NORMAL;
}

/**
 * Flags when starting an overlay (playing = true).
 * Base OVERLAY_SLOT (0x08); OR FIRE_FORGET (0x001) except looping overlay bands.
 * Additive-stop IDs also OR ADDITIVE_GESTURE (0x400) so AnimRun fade-out
 * matches gesture semantics (stop uses 0x400; start is 0x08 only).
 */
export function resolveOverlayStartFlags(serverId: number): number {
  let flags = 0x08; // OVERLAY_SLOT
  const id = serverId & 0xffff;
  if(OVERLAY_STOP_ADDITIVE_IDS.has(id) || SET_ANIMATION_OVERLAY_IDS.has(id)){
    // Additive gesture fade-out on the animation stack
    if(OVERLAY_STOP_ADDITIVE_IDS.has(id)){
      flags |= 0x400;
    }
  }
  if(OVERLAY_START_NO_FIRE_FORGET_IDS.has(id)){
    return flags;
  }
  // Remaining overlay starts get fire-forget
  return flags | 0x001;
}

/**
 * Flags when clearing an overlay (playing = false).
 * Additive gesture IDs → 0x400; otherwise 0x80.
 */
export function resolveOverlayStopFlags(serverId: number): number {
  const id = serverId & 0xffff;
  if(OVERLAY_STOP_ADDITIVE_IDS.has(id)){
    return 0x400;
  }
  return 0x80;
}
