/**
 * Retail GetPropertyDescription and Add* helpers.
 * Builds the stats + DescIdentified text shown in equip/inventory/store description panes.
 */
import { GameState } from '@/GameState';
import { WeaponSize } from '@/enums/combat/WeaponSize';
import { ModuleItemProperty } from '@/enums/module/ModuleItemProperty';
import type { ItemProperty } from '@/engine/ItemProperty';
import type { ModuleItem } from '@/module/ModuleItem';

/** TLK: Required Feats (0x9688) */
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

function usableProperties(item: ModuleItem): ItemProperty[] {
  return (item.properties || []).filter(p => p?.isUseable?.());
}

function hasProperty(item: ModuleItem, propertyName: number): boolean {
  return usableProperties(item).some(p => p.propertyName === propertyName);
}

function propsOfType(item: ModuleItem, propertyName: number): ItemProperty[] {
  return usableProperties(item).filter(p => p.propertyName === propertyName);
}

/** Retail GetPropertyDamageRange — iprp_damagecost NumDice/Die. */
export function getPropertyDamageRange(costValue: number): { min: number; max: number } {
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

/** Retail GetDamageTypeString */
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
 * Retail GetPropertyStrings
 * returns [propertyName, subtypeName, costValueName, param1Name].
 */
export function getPropertyStrings(
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
    // Retail GetIPRPParamTable — param tables are named iprp_param*.2da via iprp_paramtable
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

/** Retail AddFeatRequirements */
function addFeatRequirements(item: ModuleItem, out: string[]) {
  const base = item.baseItem;
  if(!base) return;

  const reqFeats = [
    base.requiredFeat0, base.requiredFeat1, base.requiredFeat2,
    base.requiredFeat3, base.requiredFeat4,
  ].filter(id => typeof id === 'number' && id > 0);

  // Prefer a single weapon-proficiency family member (retail 4/5/6 filter).
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

/** Retail AddDamageProperties — base damage line + bonus damage summaries. */
function addDamageProperties(item: ModuleItem, out: string[]) {
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

function addExtraDamageLine(item: ModuleItem, out: string[], propertyId: number) {
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

function addOffTypeDamageBonuses(item: ModuleItem, out: string[], baseFlags: number) {
  const bySubtype = new Map<number, ItemProperty[]>();
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

/** Retail AddRangeProperties */
function addRangeProperties(item: ModuleItem, out: string[]) {
  const base = item.baseItem;
  if(!base?.rangedWeapon) return;
  const rangeM = Math.floor(base.maxAttackRange || 0);
  append(out, `${tlk(STR_RANGE)}: ${rangeM}m\n\n`);
}

/** Retail AddCriticalThreatProperties */
function addCriticalThreatProperties(item: ModuleItem, out: string[]) {
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

/** Retail AddWeaponSizeProperties — weapon_size == 2 (SMALL). */
function addWeaponSizeProperties(item: ModuleItem, out: string[]) {
  if(item.baseItem?.weaponSize === WeaponSize.SMALL){
    const note = tlk(STR_WEAPON_SIZE_SMALL);
    if(note) append(out, `${note}\n\n`);
  }
}

/** Retail AddAttackModifierProperties */
function addAttackModifierProperties(item: ModuleItem, out: string[]) {
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

function addAttackBonusStrings(item: ModuleItem, out: string[], propertyId: number) {
  for(const prop of propsOfType(item, propertyId)){
    const strings = getPropertyStrings(propertyId, prop.subType | 0, prop.costValue | 0, 0xff);
    const amount = strings.cost || String(prop.costValue | 0);
    append(out, `+${amount} ${tlk(STR_VS)} ${strings.subtype}\n`);
  }
}

/** Retail AddDefenceProperties */
function addDefenceProperties(item: ModuleItem, out: string[]) {
  const base = item.baseItem;
  let ac = base?.baseAC || 0;
  for(const prop of propsOfType(item, ModuleItemProperty.Armor)){
    if(base?.acEnchant){
      // When ac_enchant is set, only the highest Armor bonus applies (retail GetExistsHigherValuedProperty).
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

/** Retail AddOnHitProperties — simplified GetPropertyStrings line. */
function addOnHitProperties(item: ModuleItem, out: string[]) {
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
 * Retail AddMiscellaneousProperties — remaining usable props via GetPropertyStrings.
 * Full cast-spell charge math is approximated as name + subtype + cost labels.
 */
function addMiscellaneousProperties(item: ModuleItem, out: string[]) {
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
 * Retail GetPropertyDescription.
 */
export function getItemPropertyDescription(item: ModuleItem): string {
  if(!item) return '';

  const parts: string[] = [];
  const itemType = item.baseItem?.itemType ?? -1;

  // Retail skips item_type 0x2E and grenades (6).
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
