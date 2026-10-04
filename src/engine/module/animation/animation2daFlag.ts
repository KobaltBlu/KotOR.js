import type { SWAnimation } from "@engine/rules/SWAnimation";

/**
 * animations.2da flag columns are 0/1 in the table; SWAnimation exposes them
 * as booleans. Call sites historically compared String(value) === '1', which
 * fails for boolean `true`. Accept all engine/JS shapes.
 */
export function isAnimation2DAFlagSet(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

/**
 * Stationary classification for the current clip.
 * Missing / undefined rows default to stationary (non-loco clips).
 */
export function isStationaryAnimation(anim: SWAnimation | null | undefined): boolean {
  if(!anim){
    return true;
  }
  return isAnimation2DAFlagSet(anim.stationary);
}

export function isPauseAnimation(anim: SWAnimation | null | undefined): boolean {
  return !!anim && isAnimation2DAFlagSet(anim.pause);
}

export function isWalkingAnimation(anim: SWAnimation | null | undefined): boolean {
  return !!anim && isAnimation2DAFlagSet(anim.walking);
}

export function isRunningAnimation(anim: SWAnimation | null | undefined): boolean {
  return !!anim && isAnimation2DAFlagSet(anim.running);
}

export function isHideEquippedItemsAnimation(anim: SWAnimation | null | undefined): boolean {
  return !!anim && isAnimation2DAFlagSet(anim.hideequippeditems);
}

export function isAttackAnimation(anim: SWAnimation | null | undefined): boolean {
  return !!anim && isAnimation2DAFlagSet(anim.attack);
}

export function isParryAnimation(anim: SWAnimation | null | undefined): boolean {
  return !!anim && isAnimation2DAFlagSet(anim.parry);
}

/**
 * Dialog-classified clip: dialog flag and (looping or fireforget).
 */
export function isDialogAnimation(anim: SWAnimation | null | undefined): boolean {
  if(!anim || !isAnimation2DAFlagSet(anim.dialog)){
    return false;
  }
  return isAnimation2DAFlagSet(anim.looping) || isAnimation2DAFlagSet(anim.fireforget);
}

/**
 * Play-out-of-place is not driven by the 2DA column (always 0).
 * These server animation ID bands temporarily detach the anim root from world pose.
 * Bands: 0x4B0–0x52F (1200–1327) and 0x640–0x6BF (1600–1727).
 */
export function isPlayOutOfPlaceServerId(serverId: number): boolean {
  const id = serverId & 0xffff;
  return (id >= 0x4b0 && id <= 0x52f) || (id >= 0x640 && id <= 0x6bf);
}
