import { WeaponWield } from "@/enums/combat/WeaponWield";
import { isGrenadeItemType } from "@/combat/item-cast-grenade";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";

/**
 * Retail CSWSCreature::EquipMostDamagingMeleeWeapon / RangedWeapon helpers.
 * Score candidates within a weapon class only — never compare melee dice to a
 * currently equipped blaster (that blocked GN_EquipAppropriateWeapon switches).
 */

function weaponDamageScore(item: ModuleItem | undefined): number {
  if(!item?.baseItem) return -1;
  const dice = (item.baseItem.dieToRoll || 0) * (item.baseItem.numDice || 0);
  return Number.isFinite(dice) ? dice : -1;
}

export function isMeleeWeaponItem(item: ModuleItem | undefined): boolean {
  if(!item?.baseItem) return false;
  const w = item.baseItem.weaponWield;
  return (
    w === WeaponWield.STUN_BATON ||
    w === WeaponWield.ONE_HANDED_SWORD ||
    w === WeaponWield.TWO_HANDED_SWORD
  );
}

export function isRangedWeaponItem(item: ModuleItem | undefined): boolean {
  if(!item?.baseItem) return false;
  // Grenades are rangedWeapon=1 in baseitems but never WeaponWield blasters
  if(isGrenadeItemType(item.baseItem.itemType)) return false;
  const w = item.baseItem.weaponWield;
  return (
    w === WeaponWield.BLASTER_PISTOL ||
    w === WeaponWield.BLASTER_RIFLE ||
    w === WeaponWield.BLASTER_HEAVY
  );
}

function pickBest(
  candidates: ModuleItem[],
  prefer: (item: ModuleItem) => boolean
): ModuleItem | undefined {
  let best: ModuleItem | undefined;
  let bestScore = -1;
  for(let i = 0; i < candidates.length; i++){
    const item = candidates[i];
    if(!item || !prefer(item)) continue;
    const score = weaponDamageScore(item);
    if(!best || score > bestScore){
      best = item;
      bestScore = score;
    }
  }
  return best;
}

function collectWeaponCandidates(
  creature: ModuleCreature,
  equipped: ModuleItem | undefined
): ModuleItem[] {
  const out: ModuleItem[] = [];
  const inventory = creature.getInventory() || [];
  for(let i = 0; i < inventory.length; i++){
    if(inventory[i]) out.push(inventory[i]);
  }
  // Equipped weapons are often not in the backpack list — still candidates.
  if(equipped && out.indexOf(equipped) < 0){
    out.push(equipped);
  }
  const off = creature.equipment?.LEFTHAND;
  if(off && out.indexOf(off) < 0){
    out.push(off);
  }
  return out;
}

/**
 * Best melee in possession; if none, best ranged (NWScript 399 comment).
 */
export function findMostDamagingMelee(
  creature: ModuleCreature,
  offHand = false
): ModuleItem | undefined {
  const equipped = offHand ? creature.equipment.LEFTHAND : creature.equipment.RIGHTHAND;
  const candidates = collectWeaponCandidates(creature, equipped);
  return (
    pickBest(candidates, isMeleeWeaponItem) ||
    pickBest(candidates, isRangedWeaponItem)
  );
}

/**
 * Best ranged in possession; if none, best melee (NWScript 400 comment).
 */
export function findMostDamagingRanged(
  creature: ModuleCreature
): ModuleItem | undefined {
  const equipped = creature.equipment.RIGHTHAND;
  const candidates = collectWeaponCandidates(creature, equipped);
  return (
    pickBest(candidates, isRangedWeaponItem) ||
    pickBest(candidates, isMeleeWeaponItem)
  );
}
