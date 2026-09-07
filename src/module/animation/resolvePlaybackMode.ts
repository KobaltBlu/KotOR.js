import { AnimationPlaybackMode } from "@/enums/animation/AnimationPlaybackMode";
import type { SWAnimation } from "@/engine/rules/SWAnimation";

/**
 * reverse-mode special server ID (SetAnimation mode tables).
 * Outside band A/B tables → defaults to NORMAL except this ID.
 */
export const ANIMATION_REVERSE_SERVER_ID = 10256;

/**
 * Server IDs that SetOverlayAnimation  treats as additive
 * (flag 0x400 on stop). Used as a mode-1 overlay band when 2DA overlay is unset.
 */
const OVERLAY_ADDITIVE_SERVER_IDS = new Set<number>([
  0x272d, 0x272e, 0x2732,
  0x2736, 0x2737, 0x2738, 0x2739, 0x273a,
  0x2756, 0x2757,
  0x2798, 0x27a1,
  0x27aa, 0x27ab,
]);

/**
 * Resolve SetAnimation playback mode for a creature server animation ID.
 * Prefer embedded overlay-ID set + animations.2da `overlay` column; full
 * kSetAnimationModeA/B tables remain a follow-up extraction.
 */
export function resolvePlaybackMode(
  serverId: number,
  twoDA?: SWAnimation | null
): AnimationPlaybackMode {
  if(serverId === ANIMATION_REVERSE_SERVER_ID){
    return AnimationPlaybackMode.REVERSE;
  }

  if(OVERLAY_ADDITIVE_SERVER_IDS.has(serverId & 0xffff)){
    return AnimationPlaybackMode.OVERLAY;
  }

  if(twoDA && String(twoDA.overlay) === '1'){
    return AnimationPlaybackMode.OVERLAY;
  }

  return AnimationPlaybackMode.NORMAL;
}

/**
 * Aurora flags when starting an overlay (arg3 != 0 → 0x08 | often 0x001).
 */
export function resolveOverlayStartFlags(serverId: number): number {
  let flags = 0x08; // OVERLAY_SLOT
  const id = serverId & 0xffff;
  if(OVERLAY_ADDITIVE_SERVER_IDS.has(id)){
    flags |= 0x400; // ADDITIVE_GESTURE
  }
  // ORs fire-forget (0x001) except for certain looping overlay bands.
  if(id < 0x273b){
    if(id > 0x2735){
      return flags;
    }
    if(id === 0x175 || id === 0x272e){
      return flags;
    }
  }else if(id > 0x27a9 && id < 0x27ac){
    return flags;
  }
  return flags | 0x001;
}

/**
 * Aurora stop flags when clearing an overlay (arg3 == 0).
 * Additive gesture IDs → 0x400; otherwise 0x80.
 */
export function resolveOverlayStopFlags(serverId: number): number {
  const id = serverId & 0xffff;
  if(OVERLAY_ADDITIVE_SERVER_IDS.has(id)){
    return 0x400;
  }
  return 0x80;
}
