import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";

/**
 * grenade throw helpers — item-cast action
 * case 6 (baseitems ItemType 6).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file item-cast-grenade.ts
 */

/** baseitems.2da ItemType for grenades. */
export const GRENADE_ITEM_TYPE = 6;

/** Under-handed throw when the target is within 10m. */
export const GRENADE_CLOSE_RANGE = 10;

/** pause timer 0x5DC for every grenade throw. */
export const GRENADE_PAUSE_MS = 1500;

/** conjure gate 0x320 (high throw) / 0x2BC (close, low throw). */
export const GRENADE_THROW_HIGH_GATE_MS = 800;
export const GRENADE_THROW_LOW_GATE_MS = 700;

export function isGrenadeItemType(itemType: number | undefined): boolean {
  return (itemType | 0) === GRENADE_ITEM_TYPE;
}

/**
 * appearance MODELTYPE check — only B (body) and F (full) rigs carry the
 * grenade throw animations. Everything else snaps to READY.
 */
export function canPlayGrenadeThrowAnim(modeltype: string | undefined): boolean {
  const c = String(modeltype ?? '').charAt(0).toUpperCase();
  return c === 'B' || c === 'F';
}

/**
 * case 6 animation pick. Distance is compared squared against
 * GRENADE_CLOSE_RANGE to match the engine.
 */
export function resolveGrenadeThrowAnim(
  modeltype: string | undefined,
  distanceSq: number
): ModuleCreatureAnimState {
  if(!canPlayGrenadeThrowAnim(modeltype)){
    return ModuleCreatureAnimState.READY;
  }
  return distanceSq < (GRENADE_CLOSE_RANGE * GRENADE_CLOSE_RANGE)
    ? ModuleCreatureAnimState.THROW_LOW
    : ModuleCreatureAnimState.THROW_HIGH;
}

/**
 * conjure gate before SpellCastAndImpact fires. The low (close) throw
 * releases slightly earlier than the high lob.
 */
export function resolveGrenadeGateMs(anim: ModuleCreatureAnimState): number {
  return anim === ModuleCreatureAnimState.THROW_LOW
    ? GRENADE_THROW_LOW_GATE_MS
    : GRENADE_THROW_HIGH_GATE_MS;
}
