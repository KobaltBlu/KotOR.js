import { AnimationPlaybackMode } from "@/enums/animation/AnimationPlaybackMode";
import type { SWAnimation } from "@/engine/rules/SWAnimation";
import { isAnimation2DAFlagSet } from "@/module/animation/animation2daFlag";
import {
  OVERLAY_START_NO_FIRE_FORGET_IDS,
  OVERLAY_STOP_ADDITIVE_IDS,
  resolveModeFromRetailSets,
  SET_ANIMATION_OVERLAY_IDS,
} from "@/module/animation/setAnimationModeTables";

/**
 * reverse-mode special server ID (SetAnimation 0x2810).
 * Also covered by SET_ANIMATION_REVERSE_IDS; kept for callers/tests.
 */
export const ANIMATION_REVERSE_SERVER_ID = 10256;

/**
 * Resolve SetAnimation playback mode for a creature server animation ID.
 * Prefer retail SetAnimationInternal switch sets; animations.2da `overlay`
 * column remains a fallback for IDs outside the switch.
 */
export function resolvePlaybackMode(
  serverId: number,
  twoDA?: SWAnimation | null
): AnimationPlaybackMode {
  const fromTables = resolveModeFromRetailSets(serverId);
  if(fromTables !== AnimationPlaybackMode.NORMAL){
    return fromTables;
  }

  if(twoDA && isAnimation2DAFlagSet(twoDA.overlay)){
    return AnimationPlaybackMode.OVERLAY;
  }

  return AnimationPlaybackMode.NORMAL;
}

/**
 * Aurora flags when starting an overlay (SetOverlayAnimation arg3 != 0).
 * Retail: base 0x08; OR 0x001 fire-forget except looping overlay bands.
 * KotOR.js also ORs 0x400 for stop-additive IDs so AnimRun fade matches
 * additive gesture semantics (retail stop uses 0x400; start is 0x08 only).
 */
export function resolveOverlayStartFlags(serverId: number): number {
  let flags = 0x08; // OVERLAY_SLOT
  const id = serverId & 0xffff;
  if(OVERLAY_STOP_ADDITIVE_IDS.has(id) || SET_ANIMATION_OVERLAY_IDS.has(id)){
    // Additive gesture fade-out on the Gob stack
    if(OVERLAY_STOP_ADDITIVE_IDS.has(id)){
      flags |= 0x400;
    }
  }
  if(OVERLAY_START_NO_FIRE_FORGET_IDS.has(id)){
    return flags;
  }
  // Retail: ids in 0x2736..0x273a already covered above; remaining get FAF
  return flags | 0x001;
}

/**
 * Aurora stop flags when clearing an overlay (arg3 == 0).
 * Additive gesture IDs → 0x400; otherwise 0x80.
 */
export function resolveOverlayStopFlags(serverId: number): number {
  const id = serverId & 0xffff;
  if(OVERLAY_STOP_ADDITIVE_IDS.has(id)){
    return 0x400;
  }
  return 0x80;
}
