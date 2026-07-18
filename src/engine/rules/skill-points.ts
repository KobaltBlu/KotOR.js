import { GameEngineType } from "@/enums/engine";
import { SkillType } from "@/enums/nwscript/SkillType";
import { RACE_DROID } from "@/game/equipment-menu-utils";

export interface SkillPointClass {
  skillpointbase: number | string;
  skillstable: string;
  level?: number;
}

export interface SkillPointTalent {
  rank: number;
  droidCanUse?: boolean;
  canAllClassesUse?: () => boolean;
  classData: Map<string, { isClassSkill: boolean }>;
}

export interface SkillPointCreature {
  classes: SkillPointClass[];
  skills: SkillPointTalent[];
  race?: number;
  getRace?: () => number;
  getTotalClassLevel?: (subtractNegatives?: boolean) => number;
  getINT?: (calculateBonuses?: boolean) => number;
  int?: number;
}

/** TLK: Class Skill */
export const STRREF_CLASS_SKILL = 0x9508;
/** TLK: Cross-Class Skill */
export const STRREF_CROSS_CLASS_SKILL = 0x9509;

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Retail CSWCLevelUpStats::AddSkillPointsPerLevel — points gained for the
 * given total level (K1 and K2 formulas differ).
 */
export function computeSkillPointsGained(
  skillPointBase: number,
  intelligence: number,
  level: number,
  gameKey: GameEngineType
): number {
  const intMod = getAbilityModifier(intelligence | 0);
  const base = skillPointBase | 0;

  if(gameKey === GameEngineType.TSL){
    if(level === 1){
      const sum = intMod + base;
      return sum > 1 ? sum * 4 : 4;
    }
    const sum = intMod + base;
    return sum > 1 ? sum : 1;
  }

  // K1
  if(level === 1){
    const halfBase = base >> 1;
    const sum = intMod + halfBase;
    return sum > 1 ? sum * 4 : 4;
  }
  const sum = Math.floor((intMod + base) / 2);
  return sum > 1 ? sum : 1;
}

export function getCreatureSkillPointBase(creature: SkillPointCreature): number {
  const cls = creature.classes?.[creature.classes.length - 1] || creature.classes?.[0];
  if(!cls) return 0;
  return parseInt(String(cls.skillpointbase), 10) || 0;
}

export function getCreatureIntelligence(creature: SkillPointCreature): number {
  if(typeof creature.getINT === 'function'){
    return creature.getINT(false) | 0;
  }
  return (creature.int | 0);
}

export function getCreatureLevel(creature: SkillPointCreature): number {
  if(typeof creature.getTotalClassLevel === 'function'){
    const level = creature.getTotalClassLevel(false) | 0;
    return level > 0 ? level : 1;
  }
  let total = 0;
  for(let i = 0; i < (creature.classes?.length || 0); i++){
    total += (creature.classes[i].level | 0);
  }
  return total > 0 ? total : 1;
}

export function getSkillPointsForLevel(
  creature: SkillPointCreature,
  gameKey: GameEngineType,
  level: number = getCreatureLevel(creature)
): number {
  return computeSkillPointsGained(
    getCreatureSkillPointBase(creature),
    getCreatureIntelligence(creature),
    level,
    gameKey
  );
}

export function isClassSkill(creature: SkillPointCreature, skillId: number): boolean {
  const skill = creature.skills?.[skillId];
  if(!skill) return false;
  for(let i = 0; i < (creature.classes?.length || 0); i++){
    const table = creature.classes[i]?.skillstable;
    if(!table) continue;
    const data = skill.classData.get(table) || skill.classData.get(table.toLowerCase());
    if(data?.isClassSkill) return true;
  }
  return false;
}

/**
 * Retail CSWCLevelUpStats::GetSkillPointCostForSkillRank — class 1, cross-class 2.
 * Returns 0 when the skill is not usable by any of the creature's classes.
 */
export function getSkillPointCost(
  creature: SkillPointCreature,
  skillId: number,
  increasing: boolean = true
): number {
  const skill = creature.skills?.[skillId];
  if(!skill) return 0;

  const allClasses = !!(skill.canAllClassesUse?.() || (skill as any).allClassesCanUse);
  let listedForClass = false;
  let classSkill = false;

  for(let i = 0; i < (creature.classes?.length || 0); i++){
    const table = creature.classes[i]?.skillstable;
    if(!table) continue;
    const data = skill.classData.get(table) || skill.classData.get(table.toLowerCase());
    if(data){
      listedForClass = true;
      if(data.isClassSkill){
        classSkill = true;
      }
    }
  }

  if(!allClasses && !listedForClass){
    return 0;
  }

  const cost = classSkill ? 1 : 2;
  return increasing ? cost : -cost;
}

export function getMaxSkillRank(creature: SkillPointCreature, skillId: number): number {
  const level = getCreatureLevel(creature);
  const cap = (level & 0xff) + 3;
  if(isClassSkill(creature, skillId)){
    return cap;
  }
  return cap >> 1;
}

export function getCreatureRace(creature: SkillPointCreature): number {
  if(typeof creature.getRace === 'function'){
    return creature.getRace() | 0;
  }
  return (creature.race | 0);
}

/** Retail CharGen droid blocks Stealth / Persuade / Treat Injury. */
export function isSkillBlockedForCreature(creature: SkillPointCreature, skillId: number): boolean {
  const skill = creature.skills?.[skillId];
  if(!skill) return true;
  if(getCreatureRace(creature) !== RACE_DROID) return false;

  if(
    skillId === SkillType.STEALTH ||
    skillId === SkillType.PERSUADE ||
    skillId === SkillType.TREAT_INJURY
  ){
    return true;
  }
  if(skill.droidCanUse === false){
    return true;
  }
  return false;
}

export function canIncreaseSkillRank(
  creature: SkillPointCreature,
  skillId: number,
  currentRank: number,
  availablePoints: number
): boolean {
  if(isSkillBlockedForCreature(creature, skillId)) return false;
  const cost = getSkillPointCost(creature, skillId, true);
  if(cost <= 0) return false;
  if(availablePoints < cost) return false;
  return (currentRank | 0) < getMaxSkillRank(creature, skillId);
}

export function canDecreaseSkillRank(
  currentRank: number,
  baselineRank: number
): boolean {
  return (currentRank | 0) > (baselineRank | 0);
}
