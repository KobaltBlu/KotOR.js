import { BaseItemType, CombatFeatType, ModuleItemProperty } from "@/enums";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { UseLimitationProp } from "@/engine/menu/action-menu-usable-pure";
import {
  ItemTypeCategory,
  RACE_DROID,
  RACE_HUMAN,
  checkItemAlignmentRestrictions,
  checkItemClassRestrictions,
  checkItemFeatRestrictions,
  checkItemRaceRestrictionsPure,
  getSimpleAlignmentGoodEvil,
  isMedicalItemType,
  isOtherCastSpellItemType,
  isSelfMedicalItemType,
  isSpecialOtherCastSpellItemType,
  isSquadMedicalItemType,
  passesDenySubraceMask,
  passesDroidOrHumanRestriction,
} from "@/engine/menu/action-menu-usable-pure";

export {
  ItemTypeCategory,
  RACE_DROID,
  RACE_HUMAN,
  SimpleAlignment,
  getSimpleAlignmentGoodEvil,
  checkItemAlignmentRestrictions,
  checkItemClassRestrictions,
  checkItemFeatRestrictions,
  checkItemRaceRestrictionsPure,
  isMedicalItemType,
  isOtherCastSpellItemType,
  isSelfMedicalItemType,
  isSpecialOtherCastSpellItemType,
  isSquadMedicalItemType,
  passesDenySubraceMask,
  passesDroidOrHumanRestriction,
} from "@/engine/menu/action-menu-usable-pure";

/** GetUsableItems mask bits (GetPersonalActions). */
export const UsableItemMask = {
  MEDICAL: 1,
  MINES: 2,
  OTHER: 4,
} as const;

function getItemType(item: ModuleItem): number {
  const t = item.baseItem?.itemType;
  return typeof t === 'number' ? t : -1;
}

/**
 * IsLeaderUsableItem medical / ItemType 0x19 path:
 * CastSpell property present and useable. Item powers use UserType 4
 * (not 1); do not filter on usertype here.
 */
function hasUseableCastSpellProperty(item: ModuleItem): boolean {
  for(let i = 0; i < item.properties.length; i++){
    const prop = item.properties[i];
    if(
      prop.isUseable() &&
      prop.is(ModuleItemProperty.CastSpell) &&
      prop.subType != null
    ){
      return true;
    }
  }
  return false;
}

/**
 * IsLeaderUsableItem fallthrough for forearm/droid devices:
 * CastSpell + spells.ItemTargeting == 1.
 */
function hasItemTargetingCastSpellProperty(item: ModuleItem): boolean {
  for(let i = 0; i < item.properties.length; i++){
    const prop = item.properties[i];
    if(
      !prop.isUseable() ||
      !prop.is(ModuleItemProperty.CastSpell) ||
      prop.subType == null
    ){
      continue;
    }
    const spell = GameState.SWRuleSet?.spells?.[prop.subType];
    if(spell && (spell.itemtargeting | 0) === 1){
      return true;
    }
  }
  return false;
}

function hasTrapProperty(item: ModuleItem): boolean {
  for(let i = 0; i < item.properties.length; i++){
    const prop = item.properties[i];
    if(prop.isUseable() && prop.is(ModuleItemProperty.Trap)){
      return true;
    }
  }
  return false;
}

export function passesItemDenySubrace(creature: ModuleCreature, item: ModuleItem): boolean {
  return passesDenySubraceMask(
    creature.getSubraceIndex?.() ?? creature.subraceIndex ?? 0,
    item.baseItem?.denySubrace | 0
  );
}

function collectUseLimitationProps(item: ModuleItem): UseLimitationProp[] {
  const out: UseLimitationProp[] = [];
  for(let i = 0; i < item.properties.length; i++){
    const prop = item.properties[i];
    out.push({
      propertyName: prop.propertyName | 0,
      subType: prop.subType | 0,
      useable: prop.isUseable(),
    });
  }
  return out;
}

/**
 * CheckItemRaceRestrictions (menu subset via CanUseItem).
 */
export function passesItemRaceRestriction(creature: ModuleCreature, item: ModuleItem): boolean {
  return checkItemRaceRestrictionsPure(
    creature.getRace?.() ?? creature.race ?? -1,
    creature.getSubraceIndex?.() ?? creature.subraceIndex ?? 0,
    item.baseItem?.droidOrHuman | 0,
    item.baseItem?.denySubrace | 0,
    collectUseLimitationProps(item)
  );
}

/**
 * CanUseItem UseLimitation gates
 * (alignment / class / race / feat). Weapon size + CheckProficiencies omitted
 * for personal-use HUD items (weapon_type typically 0).
 */
export function canUseItemForMenu(creature: ModuleCreature, item: ModuleItem): boolean {
  if(!creature || !item) return false;
  const props = collectUseLimitationProps(item);
  const hasProficiencyAll = !!creature.getHasFeat?.(CombatFeatType.PROFICIENCY_ALL);
  const classIds: number[] = [];
  const classes = creature.classes || [];
  for(let i = 0; i < classes.length; i++){
    classIds.push(classes[i].id | 0);
  }
  if(!checkItemAlignmentRestrictions(
    props,
    getSimpleAlignmentGoodEvil(creature.getGoodEvil?.() ?? creature.goodEvil ?? 50),
    hasProficiencyAll
  )){
    return false;
  }
  if(!checkItemClassRestrictions(props, classIds, hasProficiencyAll)){
    return false;
  }
  if(!passesItemRaceRestriction(creature, item)){
    return false;
  }
  if(!checkItemFeatRestrictions(
    props,
    (featId) => !!creature.getHasFeat?.(featId),
    hasProficiencyAll
  )){
    return false;
  }
  return true;
}

/**
 * IsLeaderUsableItem — whether an item belongs in a personal-use HUD slot.
 * Category gates first; every success path ends in CanUseItem.
 */
export function isLeaderUsableItem(
  creature: ModuleCreature,
  item: ModuleItem,
  _fromEquipment: boolean,
  mask: number
): boolean {
  if(!creature || !item) return false;
  if(item.plot){
    // Plot items: mines with trap prop + demolitions, or castable "other" from inventory/equip
    if((mask & UsableItemMask.MINES) && getItemType(item) === ItemTypeCategory.MINE && hasTrapProperty(item)){
      if(!creature.getCanUseSkill(SkillType.DEMOLITIONS)) return false;
      return canUseItemForMenu(creature, item);
    }
    if((mask & UsableItemMask.OTHER) && hasUseableCastSpellProperty(item)){
      return canUseItemForMenu(creature, item);
    }
    return false;
  }

  const area = creature.area || (creature as any).module?.area;
  if(area?.restrictMode && !item.plot) return false;

  const itemType = getItemType(item);

  if((mask & UsableItemMask.MEDICAL) && isMedicalItemType(itemType) && hasUseableCastSpellProperty(item)){
    return canUseItemForMenu(creature, item);
  }

  if((mask & UsableItemMask.MINES) && itemType === ItemTypeCategory.MINE && hasTrapProperty(item)){
    if(!creature.getCanUseSkill(SkillType.DEMOLITIONS)) return false;
    return canUseItemForMenu(creature, item);
  }

  if(mask & UsableItemMask.OTHER){
    // ItemType 0x19 — CastSpell useable (no ItemTargeting gate).
    if(itemType === ItemTypeCategory.OTHER && hasUseableCastSpellProperty(item)){
      return canUseItemForMenu(creature, item);
    }
    // Forearm bands / droid devices — require ItemTargeting == 1.
    if(isSpecialOtherCastSpellItemType(itemType) && hasItemTargetingCastSpellProperty(item)){
      return canUseItemForMenu(creature, item);
    }
  }

  return false;
}

/**
 * Whether a usable medical/recovery item should appear active (not dimmed).
 * CreateUsableItemEntry:
 * - item_type 0x2d / 0x1a (medpac / droid repair): disable when caster at full HP
 * - item_type 0x2f (squad kit): disable when no party member is injured
 * - equipped non-medical: enable bit from CastSpell.usable (property)
 * Also dims while InstantUseItem combat lockout is active.
 */
export function isUsableItemActive(
  creature: ModuleCreature,
  item: ModuleItem,
  fromEquipment: boolean = false
): boolean {
  if(
    creature.isHostileCombatEngaged?.() &&
    (creature.instantItemCooldownMs || 0) > 0
  ){
    return false;
  }

  const itemType = getItemType(item);
  if(isSelfMedicalItemType(itemType)){
    return creature.getHP() < creature.getMaxHP();
  }

  if(isSquadMedicalItemType(itemType)){
    const members = GameState.PartyManager?.party?.length
      ? GameState.PartyManager.party
      : [creature];
    for(let i = 0; i < members.length; i++){
      const m = members[i];
      if(m && m.getHP() < m.getMaxHP()) return true;
    }
    return false;
  }

  // Fallback for baseitem ids if itemType was not loaded from 2DA.
  if(
    item.baseItemId === BaseItemType.MEDICAL_EQUIPMENT ||
    item.baseItemId === BaseItemType.DROID_REPAIR_EQUIPMENT
  ){
    return creature.getHP() < creature.getMaxHP();
  }
  if(
    item.baseItemId === BaseItemType.SQUAD_RECOVERY_KIT ||
    item.baseItemId === BaseItemType.TSL_SQUAD_RECOVERY_KIT
  ){
    const members = GameState.PartyManager?.party?.length
      ? GameState.PartyManager.party
      : [creature];
    for(let i = 0; i < members.length; i++){
      const m = members[i];
      if(m && m.getHP() < m.getMaxHP()) return true;
    }
    return false;
  }

  // CreateUsableItemEntry: equipped non-medical XOR enable from CastSpell.usable.
  if(fromEquipment){
    for(let i = 0; i < item.properties.length; i++){
      const prop = item.properties[i];
      if(prop.isUseable() && prop.is(ModuleItemProperty.CastSpell)){
        return ((prop.useable | 0) & 1) !== 0;
      }
    }
  }

  return true;
}

/** CreateUsableItemEntry name: "%s (%s)" with TLK 0x9475 "(Self)". */
export function getUsableItemMenuName(item: ModuleItem): string {
  const base = item?.getName?.() || '';
  const selfLabel = GameState.TLKManager?.GetStringById?.(0x9475)?.Value;
  if(selfLabel){
    return `${base} (${selfLabel})`;
  }
  return base;
}

export function isStealthDeviceItem(item: ModuleItem): boolean {
  if(!item) return false;
  return (
    getItemType(item) === ItemTypeCategory.STEALTH_DEVICE ||
    item.baseItemId === BaseItemType.STEALTH_UNIT
  );
}

export function isGrenadeHostileItem(item: ModuleItem): boolean {
  if(!item || item.plot) return false;
  // CreateHostileItemEntry: item_type == 6 only.
  return getItemType(item) === ItemTypeCategory.GRENADE;
}

/**
 * GetDoorInterfaceMines / GetPlaceableInterfaceMines — Trap subtype
 * whitelist for planting on locked doors/placeables.
 */
const DOOR_PLACEABLE_MINE_SUBTYPES = new Set([
  3, 4, 5, 6, 7, 8,
  0xe, 0xf, 0x10,
  0x13, 0x14, 0x15, 0x16,
  0x19, 0x1a,
]);

function getUseableTrapSubtype(item: ModuleItem): number {
  if(!item) return -1;
  for(let i = 0; i < item.properties.length; i++){
    const prop = item.properties[i];
    if(prop.isUseable() && prop.is(ModuleItemProperty.Trap) && prop.subType != null){
      return prop.subType | 0;
    }
  }
  return -1;
}

/** GetSpikeDetails(param=1): ItemType 0x1b + ThievesTools. */
export function isSecuritySpikeItem(item: ModuleItem): boolean {
  if(!item) return false;
  if(getItemType(item) !== ItemTypeCategory.SECURITY_SPIKES) return false;
  for(let i = 0; i < item.properties.length; i++){
    const prop = item.properties[i];
    if(prop.isUseable() && prop.is(ModuleItemProperty.ThievesTools)){
      return true;
    }
  }
  return false;
}

/**
 * GetDoorInterfaceMines / GetPlaceableInterfaceMines mine row:
 * non-plot, ItemType 0x1c, Trap subtype in the door/placeable whitelist.
 */
export function isDoorOrPlaceableMineItem(item: ModuleItem): boolean {
  if(!item || item.plot) return false;
  if(getItemType(item) !== ItemTypeCategory.MINE) return false;
  return DOOR_PLACEABLE_MINE_SUBTYPES.has(getUseableTrapSubtype(item));
}

/**
 * placeable GetUseItems: CastSpell with spells.ItemTargeting == 2.
 */
export function isPlaceableTargetUseItem(item: ModuleItem): boolean {
  if(!item) return false;
  for(let i = 0; i < item.properties.length; i++){
    const prop = item.properties[i];
    if(
      !prop.isUseable() ||
      !prop.is(ModuleItemProperty.CastSpell) ||
      prop.subType == null
    ){
      continue;
    }
    const spell = GameState.SWRuleSet?.spells?.[prop.subType];
    if(spell && (spell.itemtargeting | 0) === 2){
      return true;
    }
  }
  return false;
}

/**
 * GetMineStrengthLevel — maps traps.2da row → strength tier.
 * Returns -1 when the trap type has no Force-counter path.
 */
export function getMineStrengthLevel(trapType: number): number {
  const t = trapType | 0;
  if(t === 0 || t === 3 || t === 6 || t === 9 || t === 0xe) return 0;
  if(t === 1 || t === 4 || t === 7 || t === 10 || t === 0xf) return 1;
  if(t === 0x11 || t === 0x13 || t === 0x15 || t === 0x17 || t === 0x19) return 2;
  if(t === 2 || t === 5 || t === 8 || t === 0xb || t === 0x10) return 3;
  if(t === 0x12 || t === 0x14 || t === 0x16 || t === 0x18 || t === 0x1a) return 4;
  return -1;
}
