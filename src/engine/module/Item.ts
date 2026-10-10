import { GameObject } from "@engine/module/GameObject";
import type { Creature } from "@engine/module/Creature";
import { BaseItem } from "@engine/items/BaseItem";
import { EffectDisguise } from "@engine/effects/EffectDisguise";
import { WeaponWield } from "@core/enums/combat/WeaponWield";
import { WeaponType } from "@core/enums/combat/WeaponType";
import { WeaponSize } from "@core/enums/combat/WeaponSize";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { ModuleItemProperty } from "@core/enums/module/ModuleItemProperty";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GFFField } from "@core/resource/GFFField";
import { GFFObject } from "@core/resource/GFFObject";
import { GFFStruct } from "@core/resource/GFFStruct";
import { CExoLocString } from "@core/resource/CExoLocString";
import { MDLLoader, ResourceLoader } from "@engine/loaders";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { TalentSpell } from "@engine/talents";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { CombatFeatType } from "@core/enums/combat/CombatFeatType";
import { Dice } from "@core/utility/Dice";
import { ItemProperty } from "@engine/items/ItemProperty";
import { GameState } from "@engine/runtime/GameState";
import { GameObjectLoadPipeline } from "@engine/module/serialization/GameObjectLoadPipeline";
import { itemSerializer } from "@engine/module/serialization/ItemSerializer";
import { ItemInstanceOverlay } from "@engine/module/serialization/ItemInstanceOverlay";
import { GameEngineType } from "@core/enums/engine/GameEngineType";
import { ActionParameterType, ActionType, GameEffectDurationType, ModuleCreatureAnimState, SkillType } from "@core/enums";
import { CombatActionType } from "@core/enums/combat/CombatActionType";
import { CombatRoundAction, SpellCastInstance } from "@engine/combat";
import { castAmmunitionProjectile } from "@engine/combat/combat-projectile";
import { isGrenadeItemType } from "@engine/combat/item-cast-grenade";
import { resolveItemCastTiming } from "@engine/combat/item-cast-timing";
import { setClientCombatMode } from "@engine/combat/combat-engagement";
import {
  calculateLastSpellProjectileTimeMs,
  resolveSpellProjectilePathType,
  shouldDelaySpellImpactToLanding,
} from "@engine/combat/spell-projectile-time";
import {
  applyDecrementUses,
  getUsedActivePropertyUsesLeft,
  canTargetItemCastByPerception,
} from "@engine/combat/item-property-uses";
import type { SWWeaponSound } from "@engine/rules/SWWeaponSound";

import { isCreature } from "@engine/module/guards/isCreature";

interface ItemPropertyDescriptionProperty {
  propertyName: number;
  subType: number;
  costValue: number;
  param1Value: number;
  isUseable?: () => boolean;
  getValue?: () => number;
}

interface ItemPropertyDescriptionHost {
  properties: ItemPropertyDescriptionProperty[];
  baseItem: BaseItem;
  getDescription?: () => string;
}

const STR_REQUIRED_FEATS = 38536;
/** TLK: Damage (0x7a99) */
const STR_DAMAGE = 31385;
/** TLK: Range (0x96a5) */
const STR_RANGE = 38565;
/** TLK: Attack Bonus (0x96a6) */
const STR_ATTACK_BONUS = 38566;
/** TLK: Defense (0x96c1) */
const STR_DEFENSE = 38593;
/** TLK: Critical Threat (0x96ab) */
const STR_CRITICAL_THREAT = 38571;
/** TLK: Max Dexterity Bonus (0xa4a0) */
const STR_MAX_DEX = 42144;
/** TLK: Small weapon offhand note (0xa4a1) */
const STR_WEAPON_SIZE_SMALL = 42145;
/** TLK: vs (0x573) */
const STR_VS = 1395;
/** TLK: empty DescIdentified fallback (0x7dac) */
const STR_NO_DESCRIPTION = 32172;
/** TLK: Physical (0x9698) — damageflags & 7 */
const STR_DMG_PHYSICAL = 38552;
/** TLK damage type names for flags 0x8.. */
const STR_DMG_TYPE_FLAGS: { flag: number; strRef: number }[] = [
  { flag: 0x8, strRef: 38553 },
  { flag: 0x10, strRef: 38554 },
  { flag: 0x20, strRef: 38555 },
  { flag: 0x40, strRef: 38556 },
  { flag: 0x80, strRef: 38557 },
  { flag: 0x100, strRef: 38558 },
  { flag: 0x200, strRef: 38559 },
  { flag: 0x400, strRef: 38560 },
  { flag: 0x800, strRef: 38561 },
  { flag: 0x1000, strRef: 38562 },
  { flag: 0x2000, strRef: 41903 },
];

/** Properties already rendered by dedicated Add* sections. */
const SPECIALIZED_PROPERTY_IDS = new Set<number>([
  ModuleItemProperty.DamageNone,
  ModuleItemProperty.Enhancement,
  ModuleItemProperty.DamagePenalty,
  ModuleItemProperty.Damage,
  ModuleItemProperty.DamageAlignmentGroup,
  ModuleItemProperty.DamageRacialGroup,
  ModuleItemProperty.DamageReduced,
  ModuleItemProperty.AttackBonus,
  ModuleItemProperty.AttackPenalty,
  ModuleItemProperty.ToHitPenalty,
  ModuleItemProperty.EnhancementAlignmentGroup,
  ModuleItemProperty.EnhancementRacialGroup,
  ModuleItemProperty.AttackBonusAlignmentGroup,
  ModuleItemProperty.AttackBonusRacialGroup,
  ModuleItemProperty.Armor,
  ModuleItemProperty.DecreaseAC,
  ModuleItemProperty.ArmorAlignmentGroup,
  ModuleItemProperty.ArmorDamageType,
  ModuleItemProperty.ArmorRacialGroup,
  ModuleItemProperty.DamageImmunity,
  ModuleItemProperty.DamageResist,
  ModuleItemProperty.Keen,
  ModuleItemProperty.Massive_Criticals,
  ModuleItemProperty.Use_Limitation_Feat,
]);

function tlk(strRef: number): string {
  if(strRef < 0) return '';
  return GameState.TLKManager.GetStringById(strRef)?.Value ?? '';
}

function append(buf: string[], text: string) {
  if(text) buf.push(text);
}

function usableProperties(item: ItemPropertyDescriptionHost): ItemPropertyDescriptionProperty[] {
  return (item.properties || []).filter(p => p?.isUseable?.());
}

function hasProperty(item: ItemPropertyDescriptionHost, propertyName: number): boolean {
  return usableProperties(item).some(p => p.propertyName === propertyName);
}

function propsOfType(item: ItemPropertyDescriptionHost, propertyName: number): ItemPropertyDescriptionProperty[] {
  return usableProperties(item).filter(p => p.propertyName === propertyName);
}

/** GetPropertyDamageRange — iprp_damagecost NumDice/Die. */
function getPropertyDamageRange(costValue: number): { min: number; max: number } {
  const row = costValue | 0;
  const table = GameState.TwoDAManager?.datatables?.get('iprp_damagecost');
  const data = table?.rows?.[row];
  if(!data){
    return { min: row, max: row };
  }
  const numDice = parseInt(String(data.numdice ?? ''), 10);
  if(isNaN(numDice)){
    return { min: row, max: row };
  }
  if(numDice === 0){
    return { min: 1, max: row };
  }
  const die = parseInt(String(data.die ?? ''), 10) || 0;
  return { min: numDice, max: numDice * die };
}

/** GetDamageTypeString */
function getDamageTypeString(flags: number): string {
  const parts: string[] = [];
  if((flags & 7) !== 0){
    parts.push(tlk(STR_DMG_PHYSICAL));
  }
  for(const { flag, strRef } of STR_DMG_TYPE_FLAGS){
    if((flags & flag) !== 0){
      parts.push(tlk(strRef));
    }
  }
  return parts.filter(Boolean).join(', ');
}

/**
 * GetPropertyStrings
 * returns [propertyName, subtypeName, costValueName, param1Name].
 */
function getPropertyStrings(
  propertyId: number,
  subtype: number,
  costValue: number,
  param1Value: number,
): { name: string; subtype: string; cost: string; param1: string } {
  const def = GameState.SWRuleSet?.itemPropsDef?.[propertyId];
  const name = def?.name > -1 ? tlk(def.name) : (def?.getName?.() || '');
  let subtypeName = '';
  let costName = '';
  let param1Name = '';

  if(def?.hasSubType?.() && def.subtyperesref){
    const table = GameState.TwoDAManager?.datatables?.get(def.subtyperesref.toLowerCase());
    const row = table?.rows?.[subtype];
    const nameRef = row ? parseInt(String(row.name ?? ''), 10) : -1;
    if(!isNaN(nameRef) && nameRef >= 0){
      subtypeName = tlk(nameRef);
    }
  }

  if(costValue !== 0xffff && def && def.costtableresref >= 0){
    const costLookup = GameState.SWRuleSet?.costTables?.[def.costtableresref];
    if(costLookup?.name){
      const costTable = GameState.TwoDAManager?.datatables?.get(costLookup.name.toLowerCase());
      const row = costTable?.rows?.[costValue];
      const nameRef = row ? parseInt(String(row.name ?? ''), 10) : -1;
      if(!isNaN(nameRef) && nameRef >= 0){
        costName = tlk(nameRef);
      }
    }
  }

  if(param1Value !== 0xff && def && def.param1resref >= 0){
    // GetIPRPParamTable — param tables are named iprp_param*.2da via iprp_paramtable
    const paramLookup = GameState.TwoDAManager?.datatables?.get('iprp_paramtable');
    const paramRow = paramLookup?.rows?.[def.param1resref];
    const paramTableName = paramRow ? String(paramRow.name || '').toLowerCase() : '';
    if(paramTableName){
      const paramTable = GameState.TwoDAManager?.datatables?.get(paramTableName);
      const row = paramTable?.rows?.[param1Value];
      const nameRef = row ? parseInt(String(row.name ?? ''), 10) : -1;
      if(!isNaN(nameRef) && nameRef >= 0){
        param1Name = tlk(nameRef);
      }
    }
  }

  return { name, subtype: subtypeName, cost: costName, param1: param1Name };
}

function formatFeatDisplayName(raw: string): string {
  const idx = raw.indexOf(':');
  if(idx < 0) return raw;
  const left = raw.slice(0, idx).trim();
  const right = raw.slice(idx + 1).trim();
  return right ? `${left} - ${right}` : left;
}

function getFeatName(featId: number): string {
  const table = GameState.TwoDAManager?.datatables?.get('feat');
  const row = table?.rows?.[featId];
  if(!row) return '';
  const nameRef = parseInt(String(row.name ?? ''), 10);
  if(isNaN(nameRef) || nameRef < 0) return '';
  return formatFeatDisplayName(tlk(nameRef));
}

/** AddFeatRequirements */
function addFeatRequirements(item: ItemPropertyDescriptionHost, out: string[]) {
  const base = item.baseItem;
  if(!base) return;

  const reqFeats = [
    base.requiredFeat0, base.requiredFeat1, base.requiredFeat2,
    base.requiredFeat3, base.requiredFeat4,
  ].filter(id => typeof id === 'number' && id > 0);

  // Prefer a single weapon-proficiency family member (4/5/6 filter).
  let preferredProf = 5;
  for(const id of reqFeats){
    if(id === 6 && preferredProf === 5) preferredProf = 6;
    if(id === 4 && (preferredProf === 5 || preferredProf === 6)) preferredProf = 4;
  }

  const lines: string[] = [];
  for(const id of reqFeats){
    if((id === 5 || id === 6 || id === 4) && id !== preferredProf) continue;
    const name = getFeatName(id);
    if(name) lines.push(name);
  }

  for(const prop of propsOfType(item, ModuleItemProperty.Use_Limitation_Feat)){
    const featId = prop.subType | 0;
    if(featId > 0){
      const name = getFeatName(featId);
      if(name) lines.push(name);
    }
  }

  if(!lines.length) return;
  append(out, `${tlk(STR_REQUIRED_FEATS)}:\n`);
  for(const line of lines){
    append(out, `${line}\n`);
  }
  append(out, '\n');
}

/** AddDamageProperties — base damage line + bonus damage summaries. */
function addDamageProperties(item: ItemPropertyDescriptionHost, out: string[]) {
  append(out, `${tlk(STR_DAMAGE)}: `);

  if(hasProperty(item, ModuleItemProperty.DamageNone)){
    append(out, '0\n');
    return;
  }

  const base = item.baseItem;
  const numDice = base?.numDice || 0;
  const die = base?.dieToRoll || 0;
  let min = numDice;
  let max = numDice * die;
  const flags = (base?.damageFlags || 0) || 8;
  const typeStr = getDamageTypeString(flags);
  if(typeStr){
    append(out, `${typeStr}, `);
  }

  for(const prop of usableProperties(item)){
    const id = prop.propertyName;
    const cv = prop.costValue | 0;
    if(id === ModuleItemProperty.Enhancement){
      min += cv;
      max += cv;
    }else if(id === ModuleItemProperty.DamagePenalty){
      min -= cv;
      max -= cv;
    }else if(id === ModuleItemProperty.Damage){
      const bit = 1 << (prop.subType & 31);
      if((flags & bit) !== 0){
        const range = getPropertyDamageRange(cv);
        min += range.min;
        max += range.max;
      }
    }
  }

  append(out, `${min}-${max}\n\n`);

  // Extra damage (Damage / alignment / racial) not folded into base type.
  addExtraDamageLine(item, out, ModuleItemProperty.DamageAlignmentGroup);
  addExtraDamageLine(item, out, ModuleItemProperty.DamageRacialGroup);
  addOffTypeDamageBonuses(item, out, flags);
}

function addExtraDamageLine(item: ItemPropertyDescriptionHost, out: string[], propertyId: number) {
  const props = propsOfType(item, propertyId);
  if(!props.length) return;
  let min = 0;
  let max = 0;
  let last = props[props.length - 1];
  for(const prop of props){
    const range = getPropertyDamageRange(prop.costValue | 0);
    min += range.min;
    max += range.max;
    last = prop;
  }
  const strings = getPropertyStrings(
    last.propertyName,
    last.subType | 0,
    0xffff,
    last.param1Value | 0,
  );
  const amount = min === max ? `+${min}` : `+${min}-${max}`;
  append(out, `${strings.param1 || strings.name}: ${amount} ${tlk(STR_VS)} ${strings.subtype}\n\n`);
}

function addOffTypeDamageBonuses(item: ItemPropertyDescriptionHost, out: string[], baseFlags: number) {
  const bySubtype = new Map<number, ItemPropertyDescriptionProperty[]>();
  for(const prop of propsOfType(item, ModuleItemProperty.Damage)){
    const bit = 1 << (prop.subType & 31);
    if((baseFlags & bit) !== 0) continue;
    const list = bySubtype.get(prop.subType) || [];
    list.push(prop);
    bySubtype.set(prop.subType, list);
  }
  if(!bySubtype.size) return;

  let first = true;
  for(const [subtype, props] of bySubtype){
    let min = 0;
    let max = 0;
    for(const prop of props){
      const range = getPropertyDamageRange(prop.costValue | 0);
      min += range.min;
      max += range.max;
    }
    const strings = getPropertyStrings(ModuleItemProperty.Damage, subtype, props[0].costValue | 0, 0xff);
    const amount = min === max ? `+${min}` : `+${min}-${max}`;
    const typeLabel = (subtype === 0 || subtype === 1 || subtype === 2)
      ? tlk(STR_DMG_PHYSICAL)
      : (strings.subtype || getDamageTypeString(1 << (subtype & 31)));
    if(first){
      append(out, `${strings.name}: ${amount} ${typeLabel}`);
      first = false;
    }else{
      append(out, `, ${amount} ${typeLabel}`);
    }
  }
  append(out, '\n\n');
}

/** AddRangeProperties */
function addRangeProperties(item: ItemPropertyDescriptionHost, out: string[]) {
  const base = item.baseItem;
  if(!base?.rangedWeapon) return;
  const rangeM = Math.floor(base.maxAttackRange || 0);
  append(out, `${tlk(STR_RANGE)}: ${rangeM}m\n\n`);
}

/** AddCriticalThreatProperties */
function addCriticalThreatProperties(item: ItemPropertyDescriptionHost, out: string[]) {
  const base = item.baseItem;
  if(!base) return;
  let threat = base.criticalThreat || 0;
  const mult = base.criticalHitMultiplier || 0;
  if(hasProperty(item, ModuleItemProperty.Keen)){
    threat *= 2;
  }
  const low = 21 - threat;

  let critMin = 0;
  let critMax = 0;
  for(const prop of propsOfType(item, ModuleItemProperty.Massive_Criticals)){
    const range = getPropertyDamageRange(prop.costValue | 0);
    critMin += range.min;
    critMax += range.max;
  }

  append(out, `${tlk(STR_CRITICAL_THREAT)}:\n`);
  if(critMin || critMax){
    append(out, `${low}-20,x${mult} +${critMin}-${critMax}\n\n`);
  }else{
    append(out, `${low}-20,x${mult}\n\n`);
  }
}

/** AddWeaponSizeProperties — weapon_size == 2 (SMALL). */
function addWeaponSizeProperties(item: ItemPropertyDescriptionHost, out: string[]) {
  if(item.baseItem?.weaponSize === WeaponSize.SMALL){
    const note = tlk(STR_WEAPON_SIZE_SMALL);
    if(note) append(out, `${note}\n\n`);
  }
}

/** AddAttackModifierProperties */
function addAttackModifierProperties(item: ItemPropertyDescriptionHost, out: string[]) {
  let bonus = 0;
  for(const prop of usableProperties(item)){
    const id = prop.propertyName;
    const cv = prop.costValue | 0;
    if(id === ModuleItemProperty.Enhancement || id === ModuleItemProperty.AttackBonus){
      bonus += cv;
    }else if(id === ModuleItemProperty.AttackPenalty || id === ModuleItemProperty.ToHitPenalty){
      bonus -= cv;
    }
  }

  const label = tlk(STR_ATTACK_BONUS);
  if(bonus < 0){
    append(out, `${label}: -${Math.abs(bonus)}\n`);
  }else if(bonus > 0){
    append(out, `${label}: +${bonus}\n`);
  }

  const hasTyped =
    hasProperty(item, ModuleItemProperty.EnhancementAlignmentGroup) ||
    hasProperty(item, ModuleItemProperty.EnhancementRacialGroup) ||
    hasProperty(item, ModuleItemProperty.AttackBonusAlignmentGroup) ||
    hasProperty(item, ModuleItemProperty.AttackBonusRacialGroup);

  if(hasTyped){
    if(bonus === 0){
      append(out, `${label}: `);
    }
    addAttackBonusStrings(item, out, ModuleItemProperty.EnhancementAlignmentGroup);
    addAttackBonusStrings(item, out, ModuleItemProperty.EnhancementRacialGroup);
    addAttackBonusStrings(item, out, ModuleItemProperty.AttackBonusAlignmentGroup);
    addAttackBonusStrings(item, out, ModuleItemProperty.AttackBonusRacialGroup);
  }

  append(out, '\n');
}

function addAttackBonusStrings(item: ItemPropertyDescriptionHost, out: string[], propertyId: number) {
  for(const prop of propsOfType(item, propertyId)){
    const strings = getPropertyStrings(propertyId, prop.subType | 0, prop.costValue | 0, 0xff);
    const amount = strings.cost || String(prop.costValue | 0);
    append(out, `+${amount} ${tlk(STR_VS)} ${strings.subtype}\n`);
  }
}

/** AddDefenceProperties */
function addDefenceProperties(item: ItemPropertyDescriptionHost, out: string[]) {
  const base = item.baseItem;
  let ac = base?.baseAC || 0;
  for(const prop of propsOfType(item, ModuleItemProperty.Armor)){
    if(base?.acEnchant){
      // When ac_enchant is set, only the highest Armor bonus applies (GetExistsHigherValuedProperty).
      continue;
    }
    ac += prop.costValue | 0;
  }
  if(base?.acEnchant){
    let best = 0;
    for(const prop of propsOfType(item, ModuleItemProperty.Armor)){
      best = Math.max(best, prop.costValue | 0);
    }
    ac += best;
  }
  for(const prop of propsOfType(item, ModuleItemProperty.DecreaseAC)){
    ac -= prop.costValue | 0;
  }

  if(ac !== 0){
    append(out, `${tlk(STR_DEFENSE)}: ${ac}\n\n`);
  }

  const dex = base?.dexBonus ?? -1;
  if(base && base.itemType !== 0xf && dex >= 0 && dex !== 0xff){
    append(out, `${tlk(STR_MAX_DEX)}: +${dex}\n\n`);
  }

  // AC vs type / damage immunity / resist style lines
  for(const prop of usableProperties(item)){
    const id = prop.propertyName;
    if(
      id !== ModuleItemProperty.ArmorAlignmentGroup &&
      id !== ModuleItemProperty.ArmorDamageType &&
      id !== ModuleItemProperty.ArmorRacialGroup &&
      id !== ModuleItemProperty.DamageImmunity &&
      id !== ModuleItemProperty.DamageResist
    ){
      continue;
    }
    const strings = getPropertyStrings(id, prop.subType | 0, prop.costValue | 0, 0xff);
    if(
      id === ModuleItemProperty.ArmorAlignmentGroup ||
      id === ModuleItemProperty.ArmorDamageType ||
      id === ModuleItemProperty.ArmorRacialGroup
    ){
      append(out, `+${strings.cost} ${tlk(STR_VS)} ${strings.subtype}\n\n`);
    }else{
      append(out, `${strings.name}: ${strings.cost} ${tlk(STR_VS)} ${strings.subtype}\n\n`);
    }
  }
}

/** AddOnHitProperties — simplified GetPropertyStrings line. */
function addOnHitProperties(item: ItemPropertyDescriptionHost, out: string[]) {
  for(const prop of usableProperties(item)){
    if(
      prop.propertyName !== ModuleItemProperty.OnHit &&
      prop.propertyName !== ModuleItemProperty.OnMonsterHit
    ){
      continue;
    }
    const strings = getPropertyStrings(
      prop.propertyName,
      prop.subType | 0,
      prop.costValue | 0,
      prop.param1Value | 0,
    );
    const bits = [strings.name, strings.subtype, strings.cost, strings.param1].filter(Boolean);
    if(bits.length){
      append(out, `${bits.join(' ')}\n\n`);
    }
  }
}

/**
 * AddMiscellaneousProperties — remaining usable props via GetPropertyStrings.
 * Full cast-spell charge math is approximated as name + subtype + cost labels.
 */
function addMiscellaneousProperties(item: ItemPropertyDescriptionHost, out: string[]) {
  for(const prop of usableProperties(item)){
    if(SPECIALIZED_PROPERTY_IDS.has(prop.propertyName)) continue;
    if(
      prop.propertyName === ModuleItemProperty.OnHit ||
      prop.propertyName === ModuleItemProperty.OnMonsterHit
    ){
      continue;
    }

    const strings = getPropertyStrings(
      prop.propertyName,
      prop.subType | 0,
      prop.costValue | 0,
      prop.param1Value !== undefined ? (prop.param1Value | 0) : 0xff,
    );

    if(prop.propertyName === ModuleItemProperty.Ability || prop.propertyName === ModuleItemProperty.Skill){
      const amount = strings.cost || `+${prop.getValue?.() || prop.costValue || 0}`;
      const target = strings.subtype || strings.name;
      append(out, `${strings.name}: ${amount} ${target}\n\n`.replace(/  +/g, ' '));
      continue;
    }

    const bits = [strings.name, strings.subtype, strings.cost, strings.param1].filter(Boolean);
    if(bits.length){
      append(out, `${bits.join(': ').replace(/: :/g, ':')}\n\n`);
    }
  }
}

/**
 * GetPropertyDescription.
 */
function getItemPropertyDescription(item: ItemPropertyDescriptionHost): string {
  if(!item) return '';

  const parts: string[] = [];
  const itemType = item.baseItem?.itemType ?? -1;

  // skips item_type 0x2E and grenades (6).
  if(itemType !== 0x2e && itemType !== 6){
    addFeatRequirements(item, parts);
    if((item.baseItem?.weaponType || 0) !== 0){
      addDamageProperties(item, parts);
      addRangeProperties(item, parts);
      addCriticalThreatProperties(item, parts);
      addOnHitProperties(item, parts);
      addWeaponSizeProperties(item, parts);
    }
    addAttackModifierProperties(item, parts);
    addDefenceProperties(item, parts);
    addMiscellaneousProperties(item, parts);
  }

  let identified = '';
  if(typeof item.getDescription === 'function'){
    identified = item.getDescription() || '';
  }
  if(!identified){
    identified = tlk(STR_NO_DESCRIPTION);
  }

  return parts.join('') + identified;
}

/** InstantUseItem combat lockout (= 3000). */
export const INSTANT_ITEM_USE_COOLDOWN_MS = 3000;
/** TLK: one item per combat round (inventory InstantUseItem gate). */
export const TLK_ITEM_USE_COMBAT_ROUND = 42409;

/**
* Item class.
*
* Class representing an item found in module areas, placeable, creatures, etc...
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file Item.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class Item extends GameObject {
  equippedRes: any;
  baseItemId: number;
  baseItem: BaseItem;
  addCost: number;
  cost: number;
  modelVariation: number;
  /** item BodyVariation BYTE (A=1, B=2, …); used when baseItem.modelType == 1. */
  bodyVariation: number;
  textureVariation: number;
  palleteID: number;
  loaded: boolean;
  properties: ItemProperty[];
  possessor: any;
  descIdentified: any;
  stolen: any;
  infinite: any;
  inventoryRes: any;
  stackSize: any;
  charges: any;
  deleting: any;
  dropable: any;
  identified: any;
  maxCharges: any;
  newItem: any;
  nonEquippable: any;
  pickpocketable: any;

  upgradeItems: any = {};
  upgrades: number = 0;
  upgradeLevel: number = 0;
  upgradeSlot0: number = -1;
  upgradeSlot1: number = -1;
  upgradeSlot2: number = -1;
  upgradeSlot3: number = -1;
  upgradeSlot4: number = -1;
  upgradeSlot5: number = -1;
  weaponSound: SWWeaponSound;

  constructor ( gff: GFFObject | string = new GFFObject(), deferInit = false ) {
    super();
    this.objectType |= GameObjectType.Item;

    if(typeof gff === 'string'){
      this.equippedRes = gff;
      this.template = new GFFObject();
      this.template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).setValue(gff);
    }else{
      this.template = gff;
    }

    this.baseItemId = 0;
    this.addCost = 0;
    this.cost = 0;
    this.modelVariation = 0;
    this.bodyVariation = 0;
    this.textureVariation = 1;
    this.palleteID = 0;
    this.loaded = false;
    this.properties = [];
    this.upgradeItems = {};
    this.placedInWorld = false;
    this.possessor = undefined;

    // GIT ground items defer until loadItems → load (LoadItems + AddToArea).
    if(!deferInit){
      this.initProperties();
    }

  }

  clone(): Item {
    const nItem = new Item(this.template);
    nItem.initProperties();
    nItem.stackSize = 1;
    nItem.copyUpgradeStateFrom(this);
    return nItem;
  }

  update(delta = 0){
    if(this.model instanceof OdysseyModel3D)
      this.model.update(delta);
  }

  // TypeScript follows ItemProperty.owner back to Item while checking this owner-local helper.
  // @ts-expect-error TS2577: runtime return type is string; the cycle is type-only.
  getDescription(): string {
    if(this.descIdentified instanceof CExoLocString){
      return this.descIdentified.getValue();
    }
    return this.descIdentified;
  }

  /**
   * GetPropertyDescription — stats/properties + DescIdentified
   * for equip / inventory / store description panes.
   */
  getPropertyDescription(): string {
    return getItemPropertyDescription(this);
  }

  getBaseItemId(): number {
    return this.baseItemId;
  }

  getBaseItem(): BaseItem {
    return this.baseItem;
  }

  /** Appearance body letter from baseitems.2da (e.g. 'B'). */
  getBodyVariation(){
    return this.baseItem?.bodyVar;
  }

  /**
   * SaveItem BodyVariation BYTE when modeltype == 1.
   * Falls back to bodyVar letter → A=1, B=2, …
   */
  getBodyVariationByte(): number {
    if(this.bodyVariation > 0) return this.bodyVariation | 0;
    const letter = this.baseItem?.bodyVar;
    if(typeof letter === 'string' && letter.length){
      return Math.max(0, letter.toUpperCase().charCodeAt(0) - 64);
    }
    return 0;
  }

  getModelVariation(){
    return this.modelVariation || 1;
  }

  getTextureVariation(){
    return this.textureVariation || 1;
  }

  // @ts-expect-error TS2577: BaseItem/ItemProperty owner graph is circular.
  getIcon(): string {
    return 'i'+this.baseItem.itemClass+'_'+("000" + this.getModelVariation()).slice(-3);
  }

  getWeaponWield(): WeaponWield{
    return this.baseItem.weaponWield;
  }

  getWeaponType(): WeaponType {
    return this.baseItem.weaponType;
  }

  isRangedWeapon(){
    // grenade baseitems set RangedWeapon=1 but they are UseItem casts,
    // never equipped weapons — exclude ItemType 6 so inventory classifiers
    // cannot treat a grenade as a blaster.
    if(isGrenadeItemType(this.baseItem?.itemType)) return false;
    return this.baseItem.rangedWeapon;
  }

  /** baseitems ItemType 6 — inventory CastSpell grenades. */
  isGrenade(){
    return isGrenadeItemType(this.baseItem?.itemType);
  }

  isLightsaber(): boolean {
    // Base rows 8/9/10, or TSL ItemType 0x27/0x28/0x29 (short/double/standard).
    if(this.baseItemId == 8 || this.baseItemId == 9 || this.baseItemId == 10){
      return true;
    }
    const itemType = this.baseItem?.itemType | 0;
    return itemType === 0x27 || itemType === 0x28 || itemType === 0x29;
  }

  /**
   * Whether this item should be transferred into a body bag.
   * Dropable bit (flags & 8): LoadDataFromGff defaults missing to 0;
   * LoadItem keeps UTI value when the instance struct omits Dropable.
   */
  isDropable(): boolean {
    return !!this.dropable;
  }

  hasKeen(): boolean {
    for(let i = 0, len = this.properties.length; i < len; i++){
      if(this.properties[i].isUseable() && this.properties[i].is(ModuleItemProperty.Keen)){
        return true;
      }
    }
    return false;
  }

  isStolen(){
    return this.stolen;
  }

  isInfinite(){
    return !!(this.infinite | 0);
  }

  /** item bit 2 (0x4) — store Infinite stock only; player copies clear this. */
  setInfinite(value: number = 0){
    this.infinite = value ? 1 : 0;
  }

  /**
   * GetCost — plot items are worthless; otherwise
   * floor(Cost * baseitems.itemmultiplier), with results under 2 treated as 1.
   */
  getGoldPieceValue(): number {
    if(this.plot){
      return 0;
    }
    const multiplier = this.baseItem?.itemMultiplier ?? 1;
    const value = Math.floor((this.cost | 0) * multiplier);
    return value < 2 ? 1 : value;
  }

  getPropertiesList(){
    return this.properties;
  }

  isDisguise(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Disguise)){
        return true;
      }
    }
    return false;
  }

  getDisguiseAppearance(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Disguise)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDisguiseAppearanceId(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Disguise)){
        return property.subType;
      }
    }
    return -1;
  }

  getName(){
    return this.getLocalizedName();
  }

  getEquippedRes(){
    return this.equippedRes;
  }

  getInventoryRes(){
    return this.inventoryRes;
  }

  // @ts-expect-error TS2577: ItemProperty owner graph is circular.
  getStackSize(): number {
    return this.stackSize;
  }

  /**
   * GetUsedActivePropertyUsesLeft.
   */
  getUsedActivePropertyUsesLeft(propertyIndex: number = 0): number {
    const prop = this.properties?.[propertyIndex | 0];
    return getUsedActivePropertyUsesLeft(prop, this.charges | 0, this.getStackSize() | 0);
  }

  /**
   * Active CastSpell property used by a combat-round item cast.
   */
  getActiveCastSpellProperty(propertyIndex: number = 0){
    const prop = this.properties?.[propertyIndex | 0];
    if(prop && prop.is?.(ModuleItemProperty.CastSpell)){
      return prop;
    }
    for(let i = 0; i < (this.properties?.length || 0); i++){
      if(this.properties[i]?.is?.(ModuleItemProperty.CastSpell)){
        return this.properties[i];
      }
    }
    return undefined;
  }

  setStackSize(value: number){
    return this.stackSize = value;
  }

  getLocalizedName(){
    return this.localizedName.getValue().replace(/\0[\s\S]*$/g,'');
  }

  getPalleteID(){
    return this.palleteID;
  }

  getTag(){
    return this.tag;
  }

  getACBonus(){
    let bonus = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Armor)){
        bonus += property.getValue();
      }
    }
    return this.baseItem.baseAC + bonus;
  }

  getDexBonus(){
    if(this.baseItemId){
      return this.baseItem.dexBonus || 0;
    }
    return 0;
  }

  getAttackBonus(): number {
    let bonus = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.AttackBonus)){
        bonus += property.getValue();
        break;
      }
    }

    if(isCreature(this.possessor)){
      switch(this.getWeaponWield()){
        case WeaponWield.BLASTER_PISTOL:
          if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_BLASTER)){
            bonus += 1;
          }
        break;
        case WeaponWield.BLASTER_RIFLE:
          if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_BLASTER_RIFLE)){
            bonus += 1;
          }
        break;
        case WeaponWield.BLASTER_HEAVY:
          if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_HEAVY_WEAPONS)){
            bonus += 1;
          }
        break;
        case WeaponWield.ONE_HANDED_SWORD:
        case WeaponWield.TWO_HANDED_SWORD:
        case WeaponWield.STUN_BATON:
          if(this.baseItemId == 8 || this.baseItemId == 9 || this.baseItemId == 10){
            if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_LIGHTSABER)){
              bonus += 1;
            }
            // TSL Superior Weapon Focus: Lightsaber I/II/III → +1/+2/+3 (stacks with Focus)
            if(this.possessor.getHasFeat(CombatFeatType.SUPER_WEAPON_FOCUS_LIGHTSABER_III)){
              bonus += 3;
            }else if(this.possessor.getHasFeat(CombatFeatType.SUPER_WEAPON_FOCUS_LIGHTSABER_II)){
              bonus += 2;
            }else if(this.possessor.getHasFeat(CombatFeatType.SUPER_WEAPON_FOCUS_LIGHTSABER_I)){
              bonus += 1;
            }
          }else if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_MELEE_WEAPONS)){
            bonus += 1;
          }
        break;
      }
    }

    return bonus;
  }

  getBaseDamage(){
    if(this.baseItem.numDice){
      return Dice.roll(this.baseItem.numDice, this.baseItem.die);
    }
    return 0;
  }

  getBaseDamageType(): number {
    if(this.baseItem){
      return Math.log2(this.baseItem.damageFlags) & 0xFF;
    }
    return 0;
  }

  getMonsterDamage(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Monster_Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  hasDamageBonus(): boolean {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return true;
      }
    }
    return false;
  }

  getDamageBonus(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDamageBonusType(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return property.getSubType()?.id || 0;
      }
    }
    return 0;
  }

  getDamageFlags(): number {
    return this.baseItem.damageFlags;
  }

  getCriticalThreatRangeMin(){
    return 21 - this.baseItem.criticalThreat;
  }

  getCriticalThreatRangeMax(){
    return 20;
  }

  getSTRBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 0)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDEXBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 1)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCONBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 2)){
        return property.getValue();
      }
    }
    return 0;
  }

  getINTBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 3)){
        return property.getValue();
      }
    }
    return 0;
  }

  getWISBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 4)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCHABonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 5)){
        return property.getValue();
      }
    }
    return 0;
  }

  isUpgradable(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.upgradeType >= 0 && property.upgradeType !== 255){
        return true;
      }
    }
    return this.upgradeLevel > 0;
  }

  getUpgradeSlot(index: number): number {
    switch(index){
      case 0: return this.upgradeSlot0;
      case 1: return this.upgradeSlot1;
      case 2: return this.upgradeSlot2;
      case 3: return this.upgradeSlot3;
      case 4: return this.upgradeSlot4;
      case 5: return this.upgradeSlot5;
      default: return -1;
    }
  }

  setUpgradeSlot(index: number, value: number): void {
    const slotValue = (typeof value === 'number' ? value : -1);
    switch(index){
      case 0: this.upgradeSlot0 = slotValue; break;
      case 1: this.upgradeSlot1 = slotValue; break;
      case 2: this.upgradeSlot2 = slotValue; break;
      case 3: this.upgradeSlot3 = slotValue; break;
      case 4: this.upgradeSlot4 = slotValue; break;
      case 5: this.upgradeSlot5 = slotValue; break;
    }
  }

  hasUpgradeBit(rowIndex: number): boolean {
    if(rowIndex < 0 || rowIndex > 31) return false;
    const flag = 1 << rowIndex;
    return ((this.upgrades || 0) & flag) === flag;
  }

  copyUpgradeStateFrom(source: Item): void {
    if(!source) return;
    this.upgrades = source.upgrades || 0;
    this.upgradeLevel = source.upgradeLevel || 0;
    for(let i = 0; i < 6; i++){
      this.setUpgradeSlot(i, source.getUpgradeSlot(i));
    }
  }

  castAmmunitionAtTarget(oCaster: GameObject, oTarget: GameObject){
    if(typeof oTarget == 'undefined') return;
    const ammunitiontype = this.baseItem?.ammunitionType;
    if(!(ammunitiontype >= 1)) return;
    castAmmunitionProjectile(oCaster, oTarget, this);
  }

  /**
   * UseItem → AddItemCastSpellActions (mipc / PartyMenuUseItem).
   * Schedules ITEM_CAST_SPELL on the combat round, then ensures ActionCombat.
   */
  scheduleItemCastSpell(oCaster: Creature, oTarget: GameObject, spellId: number, options: { isUserAction?: boolean; activePropertyIndex?: number } = {}){
    if(!oCaster?.combatRound) return;

    // AddItemCastSpellActions visibility (non-party ==0)
    if(oTarget && oTarget !== oCaster){
      const isPartyUI = !!(oCaster.isPartyMember?.() || oCaster.isPlayer || oCaster.isPM);
      const entry = oCaster.perceptionList?.find((o) => o.object === oTarget || o.objectId === oTarget.id);
      if(!canTargetItemCastByPerception(entry?.data, {
        isPartyOrPlayerUI: isPartyUI,
        isSelf: false,
      })){
        return;
      }
    }

    const hadPending = oCaster.combatRound.getActionPending();
    const combatAction = new CombatRoundAction();
    combatAction.actionType = CombatActionType.ITEM_CAST_SPELL;
    combatAction.target = oTarget;
    combatAction.item = this;
    combatAction.activePropertyIndex = options.activePropertyIndex ?? 0;
    combatAction.domainLevel = 1;
    combatAction.isUserAction = !!options.isUserAction;
    combatAction.setSpell(new TalentSpell(spellId));
    // Grenade / medpac spells often have **** iconresref — use inventory icon
    const spellIcon = String(combatAction.spell?.iconresref || '').trim();
    if(!spellIcon || spellIcon === '****'){
      combatAction.iconResRef = this.getIcon?.() || combatAction.iconResRef;
    }

    const modeltype = oCaster.creatureAppearance?.modeltype;
    const distanceSq = oTarget
      ? oTarget.position.distanceToSquared(oCaster.position)
      : 0;
    const timing = resolveItemCastTiming(
      this.baseItem?.itemType,
      modeltype,
      distanceSq,
      1500
    );
    combatAction.animation = timing.animation;
    combatAction.animationTime = timing.pauseMs;

    oCaster.combatRound.addAction(combatAction);
    // GetSpellCastItem — stamp caster for spell scripts
    oCaster.spellCastItem = this;

    // Hostile grenade use enables client combat mode so the action-queue UI
    // (ShowActionQueue) paints scheduled ITEM_CAST_SPELL entries.
    if(isGrenadeItemType(this.baseItem?.itemType)){
      setClientCombatMode(oCaster, true);
    }

    // AddItemCastSpellActions (arg9==0): player with pending combat
    // action → ClearAllActions(1) — queue cleared, combat-round schedule kept.
    if(hadPending && oCaster === GameState.PartyManager.getCurrentPlayer?.()){
      oCaster.clearAllActions(true);
    }

    if(!oCaster.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = new GameState.ActionFactory.ActionCombat(0xFFFF);
      oCaster.actionQueue.add(action);
    }
  }

  /**
   * DecrementUses — cost_value drives stack
   * charge / uses-per-day burn; may mark the property unusable and destroy.
   */
  decrementUses(oCaster?: Creature, propertyIndex: number = 0): void {
    if(GameState.infiniteUses) return;
    const prop =
      this.getActiveCastSpellProperty?.(propertyIndex) ||
      this.properties?.[propertyIndex | 0];
    if(!prop){
      // Fallback: legacy charges→stack when property missing
      if(this.charges > 1){
        this.charges -= 1;
        return;
      }
      if(this.charges === 1){
        this.removeFromCasterInventory(oCaster, 1);
        return;
      }
      const stack = this.getStackSize();
      if(stack <= 1){
        this.removeFromCasterInventory(oCaster, 1);
      }else{
        this.setStackSize(stack - 1);
      }
      return;
    }

    const result = applyDecrementUses({
      costValue: prop.costValue | 0,
      charges: this.charges | 0,
      stackSize: this.getStackSize() | 0,
      usesPerDay: prop.usesPerDay | 0,
      useable: prop.useable,
      itemType: this.baseItem?.itemType,
    });
    this.charges = result.charges;
    this.setStackSize(result.stackSize);
    prop.usesPerDay = result.usesPerDay;
    prop.useable = result.useable;
    if(result.destroyItem){
      this.removeFromCasterInventory(oCaster, 1);
    }
  }

  /**
   * Party inventory lives in InventoryManager; creature inventory on GameObject.
   */
  private removeFromCasterInventory(oCaster: Creature | undefined, nCount: number = 1): void {
    if(!oCaster) return;
    if(oCaster.isPartyMember?.() || oCaster.isPlayer || oCaster.isPM){
      GameState.InventoryManager.removeItem(this, nCount);
      return;
    }
    oCaster.removeItem?.(this, nCount);
  }

  /**
   * InstantUseItem — inventory Use Item (immediate SpellCastAndImpact).
   * During combat sets a 3s lockout (TLK 42409 / one item per round).
   */
  instantUseItem(oCaster: Creature): boolean {
    if(!oCaster) return false;

    if(
      oCaster.isHostileCombatEngaged?.() &&
      (oCaster.instantItemCooldownMs || 0) > 0
    ){
      GameState.FeedbackMessageManager?.AddStrRef?.(TLK_ITEM_USE_COMBAT_ROUND);
      return false;
    }

    for(let i = 0, len = this.properties.length; i < len; i++){
      const property = this.properties[i];
      if(!property.isUseable() || !property.is(ModuleItemProperty.CastSpell) || property.subType == null){
        continue;
      }

      const spell = new TalentSpell(property.subType);
      oCaster.spellCastItem = this;
      const cast = new SpellCastInstance(oCaster, oCaster, spell);
      cast.applySpellData();
      cast.castItem = this;
      cast.conjureTime = 0;
      cast.allowCounterSpell = false;
      // InstantUseItem still SpellCastAndImpact — stamp caster level
      // GetSpellCastItem; delay impact when the spell is a throw / projectile.
      const lastClass = oCaster.classes?.[oCaster.classes.length - 1];
      oCaster.baseClassLevel = (lastClass?.level | 0);
      oCaster.itemSpellCastActive = true;
      spell.setCasterLevel?.(oCaster.baseClassLevel);

      if(shouldDelaySpellImpactToLanding(spell, false)){
        cast.impactAtProjectileLanding = true;
        const pathType = resolveSpellProjectilePathType(spell.projtype) || 6;
        // Self-target InstantUse — flight distance ~0; still honor path-6 hang
        const flightMs = calculateLastSpellProjectileTimeMs(0.01, pathType);
        cast.castTime = Math.max(1, flightMs);
        oCaster.area?.attachSpellInstance?.(cast);
        cast.init();
      }else{
        cast.castTime = 0;
        oCaster.area?.attachSpellInstance?.(cast);
        cast.init();
        cast.impact();
        cast.completed = true;
        oCaster.itemSpellCastActive = false;
      }

      this.decrementUses(oCaster);

      if(oCaster.combatData?.combatState){
        oCaster.instantItemCooldownMs = INSTANT_ITEM_USE_COOLDOWN_MS;
      }
      return true;
    }
    return false;
  }

  /**
   * Use item on a target. HUD / scripted UseItem uses combat-round cast;
   * non-CastSpell props keep direct action enqueue.
   */
  useItemOnObject(oCaster: Creature, oTarget: GameObject, options: { isUserAction?: boolean } = {}){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(!property.isUseable()){ continue; }

      if(property.is(ModuleItemProperty.CastSpell)){
        // UseItem → AddItemCastSpellActions (combat round path)
        this.scheduleItemCastSpell(oCaster, oTarget, property.subType, {
          isUserAction: options.isUserAction,
          activePropertyIndex: i,
        });
      }else if(property.is(ModuleItemProperty.ThievesTools)){
        const action = new GameState.ActionFactory.ActionUnlockObject();
        action.setParameter(0, ActionParameterType.DWORD, oTarget);
        action.setParameter(1, ActionParameterType.DWORD, this);
        oCaster.actionQueue.add(action);
      }else if(property.is(ModuleItemProperty.Trap)){
        const action = new GameState.ActionFactory.ActionSetMine();
        action.setParameter(0, ActionParameterType.DWORD, this);
        action.setParameter(1, ActionParameterType.DWORD, oTarget);
        action.setParameter(2, ActionParameterType.FLOAT, oTarget.position.x);
        action.setParameter(3, ActionParameterType.FLOAT, oTarget.position.y);
        action.setParameter(4, ActionParameterType.FLOAT, oTarget.position.z);
        oCaster.actionQueue.add(action);
      }else if(property.is(ModuleItemProperty.Droid_Repair_Kit)){
        const skill = new GameState.TalentSkill(SkillType.REPAIR);
        skill.useTalentOnObject(oTarget, oCaster, 0, this);
      }else if(property.is(ModuleItemProperty.Computer_Spike)){
        // Consume spike and grant temporary Computer Use bonus (costValue from property table)
        const bonus = Math.max(1, property.getValue?.() || property.costValue || 1);
        const effect = new GameState.GameEffectFactory.EffectSkillIncrease();
        effect.setCreator(oCaster);
        effect.setInt(0, SkillType.COMPUTER_USE);
        effect.setInt(1, bonus);
        effect.setDurationType(GameEffectDurationType.TEMPORARY);
        effect.setDuration(120); // seconds — lasts through typical computer use
        oCaster.addEffect(effect);

        if(!GameState.infiniteUses){
          const inventory = oCaster.getInventory();
          if(inventory.includes(this)){
            const stack = this.getStackSize();
            if(stack <= 1){
              const idx = inventory.indexOf(this);
              if(idx >= 0) inventory.splice(idx, 1);
              this.destroy();
            }else{
              this.setStackSize(stack - 1);
            }
          }
        }
      }
    }
  }

  load(){
    const instanceOverlay = ItemInstanceOverlay.capture(this.template.RootNode);

    if(!this.loaded && this.getEquippedRes()){
      const merged = GameObjectLoadPipeline.mergeBlueprint(this.template, {
        refField: 'EquippedRes',
        resourceKey: 'uti',
        runtimeResRef: this.getEquippedRes(),
      });
      if(merged){
        this.initProperties();
        ItemInstanceOverlay.apply(this, instanceOverlay);
        this.loaded = true;
        return true;
      }else{
        console.error('Failed to load Item template');
        if(this.template instanceof GFFObject){
          this.initProperties();
          ItemInstanceOverlay.apply(this, instanceOverlay);
          this.loaded = true;
        }
        return false;
      }
    }else if(!this.loaded && this.getInventoryRes()){
      const merged = GameObjectLoadPipeline.mergeBlueprint(this.template, {
        refField: 'InventoryRes',
        resourceKey: 'uti',
        runtimeResRef: this.getInventoryRes(),
      });
      if(merged){
        this.initProperties();
        ItemInstanceOverlay.apply(this, instanceOverlay);
        this.loaded = true;
        return true;
      }else{
        console.error('Failed to load Item template');
        if(this.template instanceof GFFObject){
          this.initProperties();
          ItemInstanceOverlay.apply(this, instanceOverlay);
          this.loaded = true;
        }
        return false;
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      this.loaded = true;
      // this.loadScripts;
      return true;
    }
  }

  async loadModel(): Promise<OdysseyModel3D> {
    if(!this.baseItem){ 
      this.model = new OdysseyModel3D;
      return this.model;
    }

    let itemclass = this.baseItem.itemClass;
    let defaultModel = this.baseItem.defaultModel;
    itemclass = itemclass.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
    defaultModel = defaultModel.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();

    if(defaultModel != 'i_null'){
      defaultModel = this.nthStringConverter(defaultModel, this.getModelVariation());
      if(!parseInt(defaultModel.substr(-3))){
        defaultModel = itemclass+'_'+(('000'+this.getModelVariation()).substr(-3));
      }
    }

    try{
      const mdl = await MDLLoader.loader.load(defaultModel);
      const model = await OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        lighting: true,
        // envmap assign — baseitems.2da PartEnvMap flags item parts to receive the
        // area envmap ("DEFAULT" resolves to the area's DefaultEnvMap).
        envMapOverride: this.baseItem.partEnvMap ? 'DEFAULT' : undefined,
        //castShadow: false,
        //receiveShadow: false
      });
      this.model = model;
      return this.model;
    }catch(e){
      this.model = new OdysseyModel3D;
      return this.model;
    }
  }

  nthStringConverter(name = '', nth = 1){
    let value = nth.toString();
    name = name.substr(0, name.length - value.length);
    return name + value;
  }

  /** Desired PowerItem state — true while combat-powered. */
  poweredDesired: boolean = false;
  /** Queue looping `powered` after non-looping `powerup` finishes (PowerItem). */
  pendingPoweredAnim: boolean = false;

  /**
   * Set the weapon powered state and update the powered animation.
   * PowerItem plays powerup then queues powered (flag 0x20 follow-up).
   * @param powered - Whether the weapon should be powered
   */
  setPowered(powered: boolean){
    if(!(this.model instanceof OdysseyModel3D)){ return; }
    this.poweredDesired = powered;
    const currentAnimL = this.model.animationManager.currentAnimation || this.model.odysseyAnimationMap.get('off');
    if(!currentAnimL){ return; }
    const name = (currentAnimL.name || '').toLowerCase();

    //power up
    if(powered){
      switch(name){
        case 'off':
        case 'powerdown':
          this.pendingPoweredAnim = true;
          this.model.playAnimation('powerup');
        break;
        case 'powerup':
          this.pendingPoweredAnim = true;
        break;
        case 'powered':
          this.pendingPoweredAnim = false;
        break;
        default:
          this.pendingPoweredAnim = false;
          this.model.playAnimation('powered', true);
        break;
      }
      return;
    }

    this.pendingPoweredAnim = false;
    //power down
    switch(name){
      case 'powered':
      case 'powerup':
        this.model.playAnimation('powerdown');
      break;
      case 'powerdown':
      break;
      default:
        this.model.playAnimation('off', true);
      break;
    }
  }

  /**
   * Advance powerup → powered chain after the item Gob updates.
   * Call each frame from creature updateItems while the model is ticking.
   */
  updatePoweredAnimation(){
    if(!this.pendingPoweredAnim || !(this.model instanceof OdysseyModel3D)){ return; }
    const anim = this.model.animationManager.currentAnimation;
    const name = (anim?.name || '').toLowerCase();
    // powerup finished (cleared) or already past it
    if(!anim || name !== 'powerup'){
      this.pendingPoweredAnim = false;
      if(this.poweredDesired){
        this.model.playAnimation('powered', true);
      }
    }
  }

  /**
   * Play a fire-forget gesture clip on this item Gob (AnimBaseWield path).
   * Used for weapon flourish while body drive continues on the creature model.
   */
  playWeaponGesture(clipName: string): boolean {
    if(!(this.model instanceof OdysseyModel3D) || !clipName){ return false; }
    const name = clipName.toLowerCase().trim();
    if(!this.model.odysseyAnimationMap?.has(name)){ return false; }
    this.model.playAnimation(name, false);
    return true;
  }

  static FromResRef(resRef: string): Item {
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], resRef);
    if(buffer){
      const item = new Item(new GFFObject(buffer));
      item.initProperties();
      return item;
    }
    return undefined;
  }

  getSpells(){
    let spells = [];

    //propertyName, subType, costTable, costValue, param1, param1Value, chanceAppear, usesPerDay, useable, upgradeType
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      //Activate Item
      if(property.propertyName == ModuleItemProperty.CastSpell){
        spells.push(new TalentSpell(property.subType));
      }
    }

    return spells;
  }

  initProperties(){
    if(this.loaded){
      return;
    }

    const needsRegister = !this.initialized;
    itemSerializer.deserialize(this, this.template);

    if(this.baseItemId !== undefined && this.baseItemId !== null){
      this.baseItem = BaseItem.From2DA(this.baseItemId);
    }
    if(!(this as any)._bodyVariationFromGff && this.baseItem?.modelType == 1){
      const letter = this.baseItem.bodyVar;
      if(typeof letter === 'string' && letter.length){
        this.bodyVariation = Math.max(0, letter.toUpperCase().charCodeAt(0) - 64);
      }
    }

    this.weaponSound = GameState.SWRuleSet.weaponSounds[this.baseItem?.weaponMaterialType];

    if(needsRegister){
      GameState.GameObjectManager.RegisterObject(this);
    }
    this.initialized = true;
  }

  setPossessor( oCreature: GameObject){
    this.possessor = oCreature;
  }

  getPossessor(){
    return this.possessor;
  }

  onEquip(oCreature: Creature){
    console.log('Item.onEquip', oCreature, this);
    if(this.isDisguise()){
      oCreature.removeEffectsByType( GameEffectType.EffectDisguise ); //EFFECT_DISGUISE
      let eDisguise = new EffectDisguise();
      eDisguise.setInt(0, this.getDisguiseAppearanceId());
      eDisguise.setCreator(this);
      eDisguise.setAttachedObject(oCreature);
      oCreature.addEffect( eDisguise );
    }
    if(GameState.PartyManager.party.indexOf(oCreature) >= 0){
      GameState.InventoryManager.removeItem(this);
    }else{
      oCreature.removeItem(this, this.getStackSize?.() ?? 1);
    }
    this.setPossessor(oCreature);
  }

  onUnEquip(oCreature: Creature){
    console.log('Item.onUnEquip', oCreature, this);
    oCreature.removeEffectsByCreator(this);
    if(GameState.PartyManager.party.indexOf(oCreature) >= 0){
      GameState.InventoryManager.addItem(this);
    }else{
      oCreature.addItem(this);
    }
    this.setPossessor(undefined);
  }

  destroy(): void {
    super.destroy();
    if(this.placedInWorld){
      if(this.area) this.area.detachObject(this);
    }
  }

  save(){
    return itemSerializer.serialize(this, {
      gameKey: GameState.GameKey == GameEngineType.TSL ? 'k2' : 'k1',
    });
  }

}
