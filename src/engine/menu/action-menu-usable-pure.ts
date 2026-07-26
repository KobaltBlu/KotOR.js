/** Retail GetPersonalActions / IsLeaderUsableItem item_type constants. */
export const ItemTypeCategory = {
  OTHER: 0x19,
  STEALTH_DEVICE: 0x2c,
  MEDICAL_A: 0x2d,
  MEDICAL_B: 0x2f,
  MEDICAL_C: 0x1a,
  MINE: 0x1c,
  /** Security / programming spikes (baseitems ItemType). */
  SECURITY_SPIKES: 0x1b,
  GRENADE: 6,
  /** Droid utility / shield / forearm bands — CastSpell under OTHER mask. */
  DROID_UTILITY: 0x0c,
  DROID_SHIELD: 0x0d,
  FOREARM_BANDS: 0x14,
} as const;

/** Racialtypes.2da rows used by CheckItemRaceRestrictions droid_or_human. */
export const RACE_DROID = 5;
export const RACE_HUMAN = 6;

/**
 * Retail CheckItemRaceRestrictions droid_or_human @ 005182f0:
 * 1 = human (race 6), 2 = droid (race 5).
 */
export function passesDroidOrHumanRestriction(race: number, droidOrHuman: number): boolean {
  const doh = droidOrHuman | 0;
  if(!doh) return true;
  if(doh === 1) return race === RACE_HUMAN;
  if(doh === 2) return race === RACE_DROID;
  return true;
}

/** Retail CreateUsableItemEntry: medpac / droid repair — caster HP only. */
export function isSelfMedicalItemType(itemType: number): boolean {
  return itemType === ItemTypeCategory.MEDICAL_A || itemType === ItemTypeCategory.MEDICAL_C;
}

/** Retail CreateUsableItemEntry: squad kit — any party member injured. */
export function isSquadMedicalItemType(itemType: number): boolean {
  return itemType === ItemTypeCategory.MEDICAL_B;
}

/** Retail CastSpell item types that also require spells.ItemTargeting == 1. */
export function isSpecialOtherCastSpellItemType(itemType: number): boolean {
  return (
    itemType === ItemTypeCategory.DROID_UTILITY ||
    itemType === ItemTypeCategory.DROID_SHIELD ||
    itemType === ItemTypeCategory.FOREARM_BANDS
  );
}

/** @deprecated use isSpecialOtherCastSpellItemType + ItemTypeCategory.OTHER */
export function isOtherCastSpellItemType(itemType: number): boolean {
  return (
    itemType === ItemTypeCategory.OTHER ||
    isSpecialOtherCastSpellItemType(itemType)
  );
}

export function isMedicalItemType(itemType: number): boolean {
  return (
    itemType === ItemTypeCategory.MEDICAL_A ||
    itemType === ItemTypeCategory.MEDICAL_B ||
    itemType === ItemTypeCategory.MEDICAL_C
  );
}

/**
 * Retail CheckItemRaceRestrictions denysubrace:
 * item denied when (denySubrace & (1 << subraceIndex)) != 0.
 */
export function passesDenySubraceMask(subraceIndex: number, denySubrace: number): boolean {
  const deny = denySubrace | 0;
  if(!deny) return true;
  return (deny & (1 << (subraceIndex & 31))) === 0;
}

/**
 * Retail CSWSCreatureStats::GetSimpleAlignmentGoodEvil @ 005a5110 /
 * adjustAlignment labels: 1 = NEUTRAL, 2 = LIGHT, 3 = DARK.
 */
export const SimpleAlignment = {
  NEUTRAL: 1,
  LIGHT: 2,
  DARK: 3,
} as const;

export function getSimpleAlignmentGoodEvil(goodEvil: number): number {
  const ge = goodEvil | 0;
  if(ge < 0x29) return SimpleAlignment.DARK;
  return ge > 0x3b ? SimpleAlignment.LIGHT : SimpleAlignment.NEUTRAL;
}

/** Property snapshot used by CanUseItem UseLimitation helpers. */
export type UseLimitationProp = {
  propertyName: number;
  subType: number;
  useable: boolean;
};

const IPRP_USE_LIMIT_ALIGN = 0x2b; // ModuleItemProperty.UseLimitationAlignmentGroup
const IPRP_USE_LIMIT_CLASS = 0x2c;
const IPRP_USE_LIMIT_RACIAL = 0x2d;
const IPRP_USE_LIMIT_FEAT = 0x39;
const IPRP_CAST_SPELL = 10;
/** CastSpell subtype that skips droid_or_human in CheckItemRaceRestrictions. */
export const CAST_SPELL_SKIP_DROID_OR_HUMAN = 0x81;

function hasUseableProp(props: UseLimitationProp[], propertyName: number): boolean {
  for(let i = 0; i < props.length; i++){
    if(props[i].useable && props[i].propertyName === propertyName) return true;
  }
  return false;
}

/**
 * Retail CheckItemAlignmentRestrictions @ 005145a0.
 * Bypass when HasFeat(PROFICIENCY_ALL / 0x5d).
 */
export function checkItemAlignmentRestrictions(
  props: UseLimitationProp[],
  simpleAlignment: number,
  hasProficiencyAll: boolean
): boolean {
  if(!hasUseableProp(props, IPRP_USE_LIMIT_ALIGN)) return true;
  if(hasProficiencyAll) return true;
  const align = simpleAlignment & 0xff;
  for(let i = 0; i < props.length; i++){
    const p = props[i];
    if(!p.useable || p.propertyName !== IPRP_USE_LIMIT_ALIGN) continue;
    if((p.subType & 0xff) !== align) return false;
  }
  return true;
}

/**
 * Retail CheckItemClassRestrictions @ 00518210.
 * OR across UseLimitationClass props — any matching class passes.
 */
export function checkItemClassRestrictions(
  props: UseLimitationProp[],
  classIds: number[],
  hasProficiencyAll: boolean
): boolean {
  if(!hasUseableProp(props, IPRP_USE_LIMIT_CLASS)) return true;
  if(hasProficiencyAll) return true;
  for(let i = 0; i < props.length; i++){
    const p = props[i];
    if(!p.useable || p.propertyName !== IPRP_USE_LIMIT_CLASS) continue;
    for(let c = 0; c < classIds.length; c++){
      if((classIds[c] & 0xff) === (p.subType & 0xff)) return true;
    }
  }
  return false;
}

/**
 * Retail CheckItemFeatRestrictions @ 00514650.
 * Fail when any UseLimitationFeat has zero remaining uses.
 * Menu uses hasFeat as remaining-uses proxy (non-zero if owned).
 */
export function checkItemFeatRestrictions(
  props: UseLimitationProp[],
  hasFeat: (featId: number) => boolean,
  hasProficiencyAll: boolean
): boolean {
  if(!hasUseableProp(props, IPRP_USE_LIMIT_FEAT)) return true;
  if(hasProficiencyAll) return true;
  for(let i = 0; i < props.length; i++){
    const p = props[i];
    if(!p.useable || p.propertyName !== IPRP_USE_LIMIT_FEAT) continue;
    if(!hasFeat(p.subType | 0)) return false;
  }
  return true;
}

/**
 * Retail CheckItemRaceRestrictions UseLimitationRacial branch @ 005182f0
 * (after denysubrace clear): if prop exists, creature race must match a subtype.
 */
export function checkItemUseLimitationRacial(
  props: UseLimitationProp[],
  race: number
): boolean {
  if(!hasUseableProp(props, IPRP_USE_LIMIT_RACIAL)) return true;
  for(let i = 0; i < props.length; i++){
    const p = props[i];
    if(!p.useable || p.propertyName !== IPRP_USE_LIMIT_RACIAL) continue;
    if((p.subType & 0xff) === (race & 0xff)) return true;
  }
  return false;
}

/**
 * Whether CastSpell subtype 0x81 is present (skips droid_or_human).
 */
export function hasCastSpellSkipDroidOrHuman(props: UseLimitationProp[]): boolean {
  for(let i = 0; i < props.length; i++){
    const p = props[i];
    if(
      p.useable &&
      p.propertyName === IPRP_CAST_SPELL &&
      (p.subType & 0xff) === CAST_SPELL_SKIP_DROID_OR_HUMAN
    ){
      return true;
    }
  }
  return false;
}

/**
 * Retail CheckItemRaceRestrictions core (droid_or_human + deny + UseLimitationRacial).
 */
export function checkItemRaceRestrictionsPure(
  race: number,
  subraceIndex: number,
  droidOrHuman: number,
  denySubrace: number,
  props: UseLimitationProp[]
): boolean {
  const skipDoh = hasCastSpellSkipDroidOrHuman(props);
  if(!skipDoh && !passesDroidOrHumanRestriction(race, droidOrHuman)){
    return false;
  }
  if(!passesDenySubraceMask(subraceIndex, denySubrace)){
    return false;
  }
  return checkItemUseLimitationRacial(props, race);
}
