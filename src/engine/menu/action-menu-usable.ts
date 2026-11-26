import { ModuleItemProperty } from "@core/enums";
import { BaseItemType } from "@core/enums/combat/BaseItemType";
import { CombatFeatType } from "@core/enums/combat/CombatFeatType";
import { SkillType } from "@core/enums/nwscript/SkillType";
import { GameState } from "@engine/runtime/GameState";
import type { Creature } from "@engine/module/Creature";
import type { Item } from "@engine/module/Item";
import type { UseLimitationProp } from "@engine/menu/action-menu-usable-pure";
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
} from "@engine/menu/action-menu-usable-pure";

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
} from "@engine/menu/action-menu-usable-pure";

/** Matches ActionMenuDisabledReason.NOT_INJURED ("Full Health"). */
const REASON_NOT_INJURED = 5;

/** GetUsableItems mask bits (GetPersonalActions). */
export const UsableItemMask = {
  MEDICAL: 1,
  MINES: 2,
  OTHER: 4,
} as const;

function getItemType(item: Item): number {
  const t = item.baseItem?.itemType;
  return typeof t === 'number' ? t : -1;
}

/** First CastSpell property on the item (only the first one counts). */
function firstCastSpellProperty(item: Item){
  for(let i = 0; i < item.properties.length; i++){
    const prop = item.properties[i];
    if(prop.is(ModuleItemProperty.CastSpell)) return prop;
  }
  return undefined;
}

/** First Trap property on the item. */
function firstTrapProperty(item: Item){
  for(let i = 0; i < item.properties.length; i++){
    const prop = item.properties[i];
    if(prop.is(ModuleItemProperty.Trap)) return prop;
  }
  return undefined;
}

export function passesItemDenySubrace(creature: Creature, item: Item): boolean {
  return passesDenySubraceMask(
    creature.getSubraceIndex?.() ?? creature.subraceIndex ?? 0,
    item.baseItem?.denySubrace | 0
  );
}

function collectUseLimitationProps(item: Item): UseLimitationProp[] {
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
export function passesItemRaceRestriction(creature: Creature, item: Item): boolean {
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
export function canUseItemForMenu(creature: Creature, item: Item): boolean {
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
 *
 * - Medical slot: medpacs / droid repair / squad kits. Other slot: ItemType
 *   0x19. Either passes when the first CastSpell property is useable, or the
 *   item has none.
 * - Mines slot: ItemType 0x1c. No Trap property passes; a useable Trap
 *   property also needs the Demolitions skill.
 * - Anything else lands in the Other slot when its first CastSpell is
 *   useable and casts a spell with ItemTargeting 1. Droid utility, droid
 *   shield and forearm-band items must be equipped for that.
 * - Plot items skip the area lock and the useable flag, but still need the
 *   ItemTargeting 1 cast (or the mine path).
 *
 * Every pass ends in CanUseItem.
 */
export function isLeaderUsableItem(
  creature: Creature,
  item: Item,
  fromEquipment: boolean,
  mask: number
): boolean {
  if(!creature || !item) return false;
  const itemType = getItemType(item);
  const isMine = (mask & UsableItemMask.MINES) !== 0 && itemType === ItemTypeCategory.MINE;

  if(!item.plot){
    const area = creature.area || (creature as any).module?.area;
    if(area?.restrictMode) return false;

    if(
      ((mask & UsableItemMask.MEDICAL) && isMedicalItemType(itemType)) ||
      ((mask & UsableItemMask.OTHER) && itemType === ItemTypeCategory.OTHER)
    ){
      const cast = firstCastSpellProperty(item);
      if(cast && !cast.isUseable()) return false;
      return canUseItemForMenu(creature, item);
    }
    if(isMine){
      return isLeaderUsableMine(creature, item);
    }
    const cast = firstCastSpellProperty(item);
    if(!cast || !cast.isUseable()) return false;
    return isLeaderUsableTargetingCast(creature, item, cast, itemType, fromEquipment, mask);
  }

  if(isMine){
    return isLeaderUsableMine(creature, item);
  }
  const cast = firstCastSpellProperty(item);
  if(!cast) return false;
  return isLeaderUsableTargetingCast(creature, item, cast, itemType, fromEquipment, mask);
}

function isLeaderUsableMine(creature: Creature, item: Item): boolean {
  const trap = firstTrapProperty(item);
  if(trap){
    if(!trap.isUseable()) return false;
    if(!creature.getCanUseSkill(SkillType.DEMOLITIONS)) return false;
  }
  return canUseItemForMenu(creature, item);
}

function isLeaderUsableTargetingCast(
  creature: Creature,
  item: Item,
  cast: { subType: number },
  itemType: number,
  fromEquipment: boolean,
  mask: number
): boolean {
  if((mask & UsableItemMask.OTHER) === 0) return false;
  if(isSpecialOtherCastSpellItemType(itemType) && !fromEquipment) return false;
  const spell = cast.subType != null ? GameState.SWRuleSet?.spells?.[cast.subType] : undefined;
  if(!spell || (spell.itemtargeting | 0) !== 1) return false;
  return canUseItemForMenu(creature, item);
}

/**
 * Why a personal-slot item is greyed out: an ActionMenuDisabledReason
 * (0 = usable), or -1 when it is greyed with nothing to report.
 * - Medpac / droid repair: greyed at full health ("Full Health").
 * - Squad kit: greyed unless the user or a party member is hurt.
 * - An equipped item follows its CastSpell useable flag.
 * - Also greyed while the in-combat item lockout runs.
 */
export function getUsableItemDisabledReason(
  creature: Creature,
  item: Item,
  fromEquipment: boolean = false
): number {
  if(
    creature.isHostileCombatEngaged?.() &&
    (creature.instantItemCooldownMs || 0) > 0
  ){
    return -1;
  }

  const itemType = getItemType(item);
  const selfMedical = isSelfMedicalItemType(itemType) || (itemType < 0 && (
    item.baseItemId === BaseItemType.MEDICAL_EQUIPMENT ||
    item.baseItemId === BaseItemType.DROID_REPAIR_EQUIPMENT
  ));
  const squadMedical = isSquadMedicalItemType(itemType) || (itemType < 0 && (
    item.baseItemId === BaseItemType.SQUAD_RECOVERY_KIT ||
    item.baseItemId === BaseItemType.TSL_SQUAD_RECOVERY_KIT
  ));

  if(squadMedical){
    const members = GameState.PartyManager?.party?.length
      ? [creature, ...GameState.PartyManager.party]
      : [creature];
    for(let i = 0; i < members.length; i++){
      const m = members[i];
      if(m && m.getHP() < m.getMaxHP()) return 0;
    }
    return REASON_NOT_INJURED;
  }

  if(selfMedical && creature.getHP() >= creature.getMaxHP()){
    return REASON_NOT_INJURED;
  }

  if(fromEquipment){
    const cast = firstCastSpellProperty(item);
    if(cast && ((cast.useable | 0) & 1) === 0) return -1;
  }

  return 0;
}

/** Whether a personal-slot item shows lit (see getUsableItemDisabledReason). */
export function isUsableItemActive(
  creature: Creature,
  item: Item,
  fromEquipment: boolean = false
): boolean {
  return getUsableItemDisabledReason(creature, item, fromEquipment) === 0;
}

/** CreateUsableItemEntry name: "%s (%s)" with TLK 0x9475 "(Self)". */
export function getUsableItemMenuName(item: Item): string {
  const base = item?.getName?.() || '';
  const selfLabel = GameState.TLKManager?.GetStringById?.(0x9475)?.Value;
  if(selfLabel){
    return `${base} (${selfLabel})`;
  }
  return base;
}

export function isStealthDeviceItem(item: Item): boolean {
  if(!item) return false;
  return (
    getItemType(item) === ItemTypeCategory.STEALTH_DEVICE ||
    item.baseItemId === BaseItemType.STEALTH_UNIT
  );
}

export function isGrenadeHostileItem(item: Item): boolean {
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

function getUseableTrapSubtype(item: Item): number {
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
export function isSecuritySpikeItem(item: Item): boolean {
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
export function isDoorOrPlaceableMineItem(item: Item): boolean {
  if(!item || item.plot) return false;
  if(getItemType(item) !== ItemTypeCategory.MINE) return false;
  return DOOR_PLACEABLE_MINE_SUBTYPES.has(getUseableTrapSubtype(item));
}

/**
 * placeable GetUseItems: CastSpell with spells.ItemTargeting == 2.
 */
export function isPlaceableTargetUseItem(item: Item): boolean {
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
