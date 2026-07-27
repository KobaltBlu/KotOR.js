import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ItemTypeCategory } from "@/engine/menu/action-menu-usable-pure";
import {
  GRENADE_PAUSE_MS,
  canPlayGrenadeThrowAnim,
  isGrenadeItemType,
  resolveGrenadeGateMs,
  resolveGrenadeThrowAnim,
} from "@/combat/item-cast-grenade";

/**
 * Retail AIActionItemCastSpell @ 0050f170 — per-baseitems ItemType animation,
 * conjure gate, and combat-round pause.
 *
 * @file item-cast-timing.ts
 */

/** Retail default CASTOUT1_LP (0x2721). */
export const ITEM_CAST_DEFAULT_ANIM = ModuleCreatureAnimState.CASTOUT1_LP;

/** Medical / OTHER (0x19, 0x1a, 0x2d): gate 0x2EE, pause 0x5DC. */
export const ITEM_CAST_MEDICAL_GATE_MS = 750;
export const ITEM_CAST_MEDICAL_PAUSE_MS = 1500;

/** Forearm bands (0x14) / MEDICAL_B (0x2f): gate 0x258 / 0x2EE, pause 0x3E8 / 0x5DC. */
export const ITEM_CAST_FOREARM_GATE_MS = 600;
export const ITEM_CAST_FOREARM_PAUSE_MS = 1000;

/** Droid utility (0x0c) default gate when client anim length is unavailable. */
export const ITEM_CAST_DROID_UTILITY_GATE_MS = 300;

/**
 * Retail droid utility gate: GetAnimationLength(0x2AF9) - 50ms, else 300ms.
 */
export function resolveDroidUtilityGateMs(animationLengthSec: number): number {
  if(!(animationLengthSec > 0)){
    return ITEM_CAST_DROID_UTILITY_GATE_MS;
  }
  return Math.max(1, Math.floor(animationLengthSec * 1000) - 0x32);
}

export type ItemCastTimingResolved = {
  grenade: boolean;
  /** Play INJECT / activate on the object target instead of the caster. */
  animOnTarget: boolean;
  animation: ModuleCreatureAnimState;
  gateMs: number;
  pauseMs: number;
  /**
   * Retail AIActionItemCastSpell droid utility (0x0c): after SpellCastAndImpact
   * hold anim 0x2AFA until pause ends (field19 post-impact phase).
   */
  postImpactAnim?: ModuleCreatureAnimState;
};

/**
 * Retail appearance MODELTYPE B/F check shared by grenade + medical inject.
 */
export function canPlayItemCastBodyAnim(modeltype: string | undefined): boolean {
  return canPlayGrenadeThrowAnim(modeltype);
}

/**
 * Retail `(-(bVar3) & 0x45) + 0x2711` → INJECT when B/F, else READY.
 */
export function resolveMedicalInjectAnim(
  modeltype: string | undefined
): ModuleCreatureAnimState {
  return canPlayItemCastBodyAnim(modeltype)
    ? ModuleCreatureAnimState.INJECT
    : ModuleCreatureAnimState.READY;
}

/**
 * Retail `(-(bVar3) & 0x87) + 0x2711` → ACTIVATE_ITEM2 when B/F, else READY.
 */
export function resolveActivateItemAnim(
  modeltype: string | undefined
): ModuleCreatureAnimState {
  return canPlayItemCastBodyAnim(modeltype)
    ? ModuleCreatureAnimState.ACTIVATE_ITEM2
    : ModuleCreatureAnimState.READY;
}

/**
 * Whether retail plays the cast anim on the target creature
 * (item types 0x19 / 0x2d / 0x2f).
 */
export function itemCastAnimPlaysOnTarget(itemType: number | undefined): boolean {
  const t = itemType | 0;
  return (
    t === ItemTypeCategory.OTHER ||
    t === ItemTypeCategory.MEDICAL_A ||
    t === ItemTypeCategory.MEDICAL_B
  );
}

/**
 * Resolve anim / gate / pause for an ItemCastSpell by baseitems ItemType.
 *
 * @param spellCastTimeMs - spells.2da casttime (+1 in retail default case)
 */
export function resolveItemCastTiming(
  itemType: number | undefined,
  modeltype: string | undefined,
  distanceSq: number,
  spellCastTimeMs: number
): ItemCastTimingResolved {
  if(isGrenadeItemType(itemType)){
    const animation = resolveGrenadeThrowAnim(modeltype, distanceSq);
    return {
      grenade: true,
      animOnTarget: false,
      animation,
      gateMs: resolveGrenadeGateMs(animation),
      pauseMs: GRENADE_PAUSE_MS,
    };
  }

  const t = itemType | 0;
  switch(t){
    case ItemTypeCategory.DROID_UTILITY:
      return {
        grenade: false,
        animOnTarget: false,
        // Retail gate anim 0x2AF9 / post-impact 0x2AFA
        animation: ModuleCreatureAnimState.DROID_UTILITY_USE,
        postImpactAnim: ModuleCreatureAnimState.DROID_UTILITY_USE_LP,
        gateMs: ITEM_CAST_DROID_UTILITY_GATE_MS,
        pauseMs: GRENADE_PAUSE_MS,
      };
    case ItemTypeCategory.FOREARM_BANDS:
      return {
        grenade: false,
        animOnTarget: false,
        animation: resolveActivateItemAnim(modeltype),
        gateMs: ITEM_CAST_FOREARM_GATE_MS,
        pauseMs: ITEM_CAST_FOREARM_PAUSE_MS,
      };
    case ItemTypeCategory.OTHER:
    case ItemTypeCategory.MEDICAL_C:
    case ItemTypeCategory.MEDICAL_A:
      return {
        grenade: false,
        animOnTarget: itemCastAnimPlaysOnTarget(t),
        animation: resolveMedicalInjectAnim(modeltype),
        gateMs: ITEM_CAST_MEDICAL_GATE_MS,
        pauseMs: ITEM_CAST_MEDICAL_PAUSE_MS,
      };
    case ItemTypeCategory.MEDICAL_B:
      return {
        grenade: false,
        animOnTarget: true,
        animation: resolveActivateItemAnim(modeltype),
        gateMs: ITEM_CAST_MEDICAL_GATE_MS,
        pauseMs: ITEM_CAST_MEDICAL_PAUSE_MS,
      };
    default: {
      const pause = Math.max(1, (spellCastTimeMs | 0) + 1);
      return {
        grenade: false,
        animOnTarget: false,
        animation: ITEM_CAST_DEFAULT_ANIM,
        gateMs: 1,
        pauseMs: pause,
      };
    }
  }
}
