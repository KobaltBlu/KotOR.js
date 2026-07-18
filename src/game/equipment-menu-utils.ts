import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { WeaponSize } from "@/enums/combat/WeaponSize";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { getAttackEffectBonus } from "@/effects/effect-bonuses";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";

/** Retail GuiInGameEquipSlotInfo — empty icon stem + TLK slot names (human/droid). */
export interface EquipSlotInfo {
  icon: string;
  humanStrRef: number;
  droidStrRef: number;
}

/** Race id for droids (retail GetIcon race == 5). */
export const RACE_DROID = 5;
/** Race id for humans (InventoryManager / droidOrHuman). */
export const RACE_HUMAN = 6;

/** TLK: Select an item to equip (LBL_SELECTTITLE). */
export const STR_SELECT_TITLE = 38154;
/** TLK: Back */
export const STR_BACK = 1582;
/** TLK: Cancel */
export const STR_CANCEL = 1581;
/** TLK: Equip */
export const STR_EQUIP = 31387;
/** TLK: You cannot equip this item. (canUse == 2) */
export const STR_CANT_EQUIP = 39986;
/** TLK: Weapon style conflict (canUse == 3). */
export const STR_WEAPON_CONFLICT = 42271;
/** TLK: Offhand blocked by large weapon (0xa568). */
export const STR_OFFHAND_BLOCKED = 42344;
/** TLK: Nothing available for this slot (0xa569). */
export const STR_NOTHING_AVAILABLE = 42345;

/**
 * Retail slotInfo table (swkotor.exe), keyed by EquipmentSlots bitmask.
 * Icon stem is formatted as `i` + (`d` if droid) + stem.
 */
export const EQUIP_SLOT_INFO: Partial<Record<ModuleCreatureArmorSlot, EquipSlotInfo>> = {
  [ModuleCreatureArmorSlot.LEFTHAND]:     { icon: 'weap_l',     humanStrRef: 31378, droidStrRef: 31378 },
  [ModuleCreatureArmorSlot.RIGHTHAND]:    { icon: 'weap_r',     humanStrRef: 31379, droidStrRef: 31379 },
  [ModuleCreatureArmorSlot.HEAD]:         { icon: 'head',       humanStrRef: 31375, droidStrRef: 41810 },
  [ModuleCreatureArmorSlot.LEFTARMBAND]:  { icon: 'forearm_l',  humanStrRef: 31376, droidStrRef: 41814 },
  [ModuleCreatureArmorSlot.RIGHTARMBAND]: { icon: 'forearm_r',  humanStrRef: 31377, droidStrRef: 41814 },
  [ModuleCreatureArmorSlot.ARMOR]:        { icon: 'armor',      humanStrRef: 31380, droidStrRef: 41813 },
  [ModuleCreatureArmorSlot.ARMS]:         { icon: 'hands',      humanStrRef: 31383, droidStrRef: 41811 },
  [ModuleCreatureArmorSlot.IMPLANT]:      { icon: 'implant',    humanStrRef: 31388, droidStrRef: 41811 },
  [ModuleCreatureArmorSlot.BELT]:         { icon: 'belt',       humanStrRef: 31382, droidStrRef: 41812 },
  // TSL secondary weapon configs reuse primary empty icons
  [ModuleCreatureArmorSlot.LEFTHAND2]:    { icon: 'weap_l',     humanStrRef: 31378, droidStrRef: 31378 },
  [ModuleCreatureArmorSlot.RIGHTHAND2]:   { icon: 'weap_r',     humanStrRef: 31379, droidStrRef: 31379 },
};

export function getEmptySlotIcon(slot: ModuleCreatureArmorSlot, race: number): string {
  const info = EQUIP_SLOT_INFO[slot];
  const stem = info?.icon ?? 'armor';
  const racePrefix = race === RACE_DROID ? 'd' : '';
  return `i${racePrefix}${stem}`;
}

export function getSlotNameStrRef(slot: ModuleCreatureArmorSlot, race: number): number {
  const info = EQUIP_SLOT_INFO[slot];
  if(!info) return 0;
  return race === RACE_DROID ? info.droidStrRef : info.humanStrRef;
}

export function formatAttackBonus(bonus: number): string {
  return bonus > 0 ? `+${bonus}` : String(bonus);
}

export function formatDamageRange(min: number, max: number): string {
  if(min <= 0 && max <= 0) return '';
  return `${min}-${max}`;
}

/** Retail colorBlue for equip labels. */
export const EQUIP_COLOR_BLUE = { r: 0, g: 0.658824, b: 0.980392 };
/** Retail colorGreen when a stat beats baseline. */
export const EQUIP_COLOR_GREEN = { r: 0, g: 1, b: 0 };

export function isTwoHandedWeapon(item?: ModuleItem): boolean {
  if(!item?.baseItem) return false;
  return item.getWeaponWield() === WeaponWield.TWO_HANDED_SWORD;
}

export function isLargeWeapon(item?: ModuleItem): boolean {
  if(!item?.baseItem) return false;
  return item.baseItem.weaponSize === WeaponSize.LARGE;
}

/**
 * Equip-screen attack bonus for a hand (BAB + ability mod + weapon AB + effects).
 * Mirrors the combat touch-attack formula in ModuleCreature.
 */
export function getEquipScreenAttackBonus(creature: ModuleCreature, weapon: ModuleItem | undefined, offHand: boolean): number {
  const ranged = !!weapon?.isRangedWeapon?.();
  const ability = Math.floor(((ranged ? creature.getDEX() : creature.getSTR()) - 10) / 2);
  // Off-hand does not get full STR contribution in dual wield; retail GetMeleeAttackBonus
  // with offHand=1 still includes ability — keep ability for both hands here.
  void offHand;
  return creature.getBaseAttackBonus() + ability + (weapon?.getAttackBonus?.() || 0) + getAttackEffectBonus(creature);
}

/**
 * Min/max damage for equip-screen labels (base dice + static damage bonus).
 */
export function getEquipScreenDamageRange(weapon: ModuleItem | undefined): { min: number; max: number } {
  if(!weapon?.baseItem?.numDice){
    return { min: 0, max: 0 };
  }
  const numDice = weapon.baseItem.numDice;
  const die = weapon.baseItem.dieToRoll || 4;
  const bonus = weapon.getDamageBonus?.() || 0;
  return {
    min: numDice + bonus,
    max: numDice * die + bonus,
  };
}

export function getOffHandSlotForMain(mainSlot: ModuleCreatureArmorSlot): ModuleCreatureArmorSlot | null {
  if(mainSlot === ModuleCreatureArmorSlot.RIGHTHAND) return ModuleCreatureArmorSlot.LEFTHAND;
  if(mainSlot === ModuleCreatureArmorSlot.RIGHTHAND2) return ModuleCreatureArmorSlot.LEFTHAND2;
  return null;
}

export function isMainHandSlot(slot: ModuleCreatureArmorSlot): boolean {
  return slot === ModuleCreatureArmorSlot.RIGHTHAND || slot === ModuleCreatureArmorSlot.RIGHTHAND2;
}

export function isOffHandSlot(slot: ModuleCreatureArmorSlot): boolean {
  return slot === ModuleCreatureArmorSlot.LEFTHAND || slot === ModuleCreatureArmorSlot.LEFTHAND2;
}
