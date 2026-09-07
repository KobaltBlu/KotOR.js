import { GameEngineType } from "@/enums/engine";
import { SkillType } from "@/enums/nwscript/SkillType";
import type { CreatureClass } from "@/combat/CreatureClass";
import {
  computeSkillPointsGained,
  getCreatureIntelligence,
  getSkillPointCost,
  isSkillBlockedForCreature,
} from "@/engine/rules/skill-points";

/**
 * ability index for attribute_index / LevelUp.
 * Order is STR,DEX,CON,INT,WIS,CHA (not CharGenAttribute).
 */
export enum LevelUpAbilityIndex {
  NONE = -1,
  STR = 0,
  DEX = 1,
  CON = 2,
  INT = 3,
  WIS = 4,
  CHA = 5,
}

/** Pending level draft mirroring. */
export interface LevelUpDraft {
  classId: number;
  /** New class level after this level-up (1-based). */
  newClassLevel: number;
  /** Total character level after this level-up. */
  newTotalLevel: number;
  attributeIndex: LevelUpAbilityIndex;
  hpChange: number;
  fpChange: number;
  /** Per-skill rank increases (length SkillType.MAX_SKILLS). */
  skillRankChanges: number[];
  skillPointsRemaining: number;
  skillPointsBudget: number;
  feats: number[];
  spellsAdded: number[];
  spellsRemoved: number[];
  featPicksRemaining: number;
  powerPicksRemaining: number;
  hasAbilityStep: boolean;
  hasSkillsStep: boolean;
  hasFeatsStep: boolean;
  hasPowersStep: boolean;
}

/** Persisted entry (LvlStatList element). */
export interface LevelStatRecord {
  classId: number;
  hpChange: number;
  fpChange: number;
  /** Ability bump index; -1 / NONE means omit LvlStatAbility on save. */
  attributeIndex: LevelUpAbilityIndex;
  skillRankChanges: number[];
  skillPointsRemaining: number;
  feats: number[];
  spellsAdded: number[];
  spellsRemoved: number[];
}

export function createEmptyLevelStatRecord(): LevelStatRecord {
  return {
    classId: 0,
    hpChange: 0,
    fpChange: 0,
    attributeIndex: LevelUpAbilityIndex.NONE,
    skillRankChanges: new Array(SkillType.MAX_SKILLS).fill(0),
    skillPointsRemaining: 0,
    feats: [],
    spellsAdded: [],
    spellsRemoved: [],
  };
}

/** Snapshot a committed level-up draft into a LvlStatList record. */
export function levelStatRecordFromDraft(draft: LevelUpDraft): LevelStatRecord {
  return {
    classId: draft.classId | 0,
    hpChange: draft.hpChange | 0,
    fpChange: draft.fpChange | 0,
    attributeIndex: draft.attributeIndex,
    skillRankChanges: draft.skillRankChanges.slice(0, SkillType.MAX_SKILLS),
    skillPointsRemaining: draft.skillPointsRemaining | 0,
    feats: draft.feats.slice(),
    spellsAdded: draft.spellsAdded.slice(),
    spellsRemoved: draft.spellsRemoved.slice(),
  };
}

export function primaryAbilityToIndex(primary: string): LevelUpAbilityIndex {
  switch((primary || '').toLowerCase()){
    case 'str': return LevelUpAbilityIndex.STR;
    case 'dex': return LevelUpAbilityIndex.DEX;
    case 'con': return LevelUpAbilityIndex.CON;
    case 'int': return LevelUpAbilityIndex.INT;
    case 'wis': return LevelUpAbilityIndex.WIS;
    case 'cha': return LevelUpAbilityIndex.CHA;
    default: return LevelUpAbilityIndex.NONE;
  }
}

/** : ability bump when (newClassLevel & 3) == 0 → levels 4/8/12/16/20. */
export function shouldOfferAbilityBump(newClassLevel: number): boolean {
  return ((newClassLevel | 0) & 3) === 0;
}

export function getFeatPicksForLevel(classData: CreatureClass, newClassLevel: number): number {
  if(!classData || newClassLevel < 1) return 0;
  const idx = (newClassLevel | 0) - 1;
  const regular = classData.featGainPoints?.[idx] | 0;
  return regular > 0 ? regular : 0;
}

export function getBonusFeatPicksForLevel(classData: CreatureClass, newClassLevel: number): number {
  if(!classData || newClassLevel < 1) return 0;
  const idx = (newClassLevel | 0) - 1;
  const bonuses = (classData as any).featGainBonuses as number[] | undefined;
  const bonus = bonuses?.[idx] | 0;
  return bonus > 0 ? bonus : 0;
}

export function getTotalFeatPicksForLevel(classData: CreatureClass, newClassLevel: number): number {
  return getFeatPicksForLevel(classData, newClassLevel) + getBonusFeatPicksForLevel(classData, newClassLevel);
}

export function getPowerPicksForLevel(classData: CreatureClass, newClassLevel: number): number {
  if(!classData || newClassLevel < 1) return 0;
  if(!classData.spellcaster && !(classData.forcedie > 0)) return 0;
  const idx = (newClassLevel | 0) - 1;
  const picks = classData.spellGainPoints?.[idx] | 0;
  return picks > 0 ? picks : 0;
}

export function createEmptyDraft(): LevelUpDraft {
  return {
    classId: -1,
    newClassLevel: 1,
    newTotalLevel: 1,
    attributeIndex: LevelUpAbilityIndex.NONE,
    hpChange: 0,
    fpChange: 0,
    skillRankChanges: new Array(SkillType.MAX_SKILLS).fill(0),
    skillPointsRemaining: 0,
    skillPointsBudget: 0,
    feats: [],
    spellsAdded: [],
    spellsRemoved: [],
    featPicksRemaining: 0,
    powerPicksRemaining: 0,
    hasAbilityStep: false,
    hasSkillsStep: false,
    hasFeatsStep: false,
    hasPowersStep: false,
  };
}

export interface LevelUpCreatureLike {
  classes: CreatureClass[];
  skills: { rank: number }[];
  skillPoints?: number;
  getTotalClassLevel?: (subtractNegatives?: boolean) => number;
  getINT?: (calculateBonuses?: boolean) => number;
  int?: number;
  getMainClass?: () => CreatureClass | false;
}

/**
 * Build a blank draft for leveling the last class (AutoLevelup class pick).
 */
export function beginLevelUpDraft(
  creature: LevelUpCreatureLike,
  gameKey: GameEngineType,
  classData?: CreatureClass
): LevelUpDraft | null {
  const cls = classData || creature.getMainClass() || creature.classes?.[creature.classes.length - 1];
  if(!cls) return null;

  const currentClassLevel = cls.level | 0;
  const newClassLevel = currentClassLevel + 1;
  const currentTotal = typeof creature.getTotalClassLevel === 'function'
    ? creature.getTotalClassLevel(false)
    : creature.classes.reduce((s, c) => s + (c.level | 0), 0);
  const newTotalLevel = currentTotal + 1;

  const leftover = (creature.skillPoints | 0);
  const skillBudget = leftover + computeSkillPointsGained(
    parseInt(String(cls.skillpointbase), 10) || 0,
    getCreatureIntelligence(creature as any),
    newClassLevel === 1 ? 1 : newClassLevel,
    gameKey
  );

  const featPicks = getTotalFeatPicksForLevel(cls, newClassLevel);
  const powerPicks = getPowerPicksForLevel(cls, newClassLevel);
  const hasAbility = shouldOfferAbilityBump(newClassLevel);

  const draft = createEmptyDraft();
  draft.classId = cls.id;
  draft.newClassLevel = newClassLevel;
  draft.newTotalLevel = newTotalLevel;
  draft.attributeIndex = hasAbility ? primaryAbilityToIndex(cls.primaryabil) : LevelUpAbilityIndex.NONE;
  draft.hpChange = cls.hitdie | 0;
  draft.fpChange = cls.forcedie | 0;
  draft.skillPointsBudget = skillBudget;
  draft.skillPointsRemaining = skillBudget;
  draft.featPicksRemaining = featPicks;
  draft.powerPicksRemaining = powerPicks;
  draft.hasAbilityStep = hasAbility;
  draft.hasSkillsStep = skillBudget > 0;
  draft.hasFeatsStep = featPicks > 0;
  draft.hasPowersStep = powerPicks > 0;
  return draft;
}

/**
 * AutoLevelup skill spend — walk recommended skills and spend points.
 * `getRecommendedSkill(recom)` should return skill index or -1.
 */
export function autoSpendSkillPoints(
  creature: LevelUpCreatureLike,
  draft: LevelUpDraft,
  getRecommendedSkill: (recom: number) => number
): void {
  let points = draft.skillPointsRemaining | 0;
  const classLevel = draft.newClassLevel | 0;
  for(let recom = 1; recom <= SkillType.MAX_SKILLS && points > 0; recom++){
    const skillId = getRecommendedSkill(recom);
    if(skillId < 0 || skillId >= SkillType.MAX_SKILLS) continue;
    if(isSkillBlockedForCreature(creature as any, skillId)) continue;

    const cost = getSkillPointCost(creature as any, skillId, true);
    if(cost <= 0) continue;

    const isCross = cost === 2;
    let maxRank = classLevel + 3;
    if(isCross) maxRank = maxRank >> 1;

    const baseline = creature.skills?.[skillId]?.rank | 0;
    const already = draft.skillRankChanges[skillId] | 0;
    let current = baseline + already;
    let room = maxRank - current;
    if(room <= 0) continue;

    if(isCross){
      let ranks = Math.min(room, Math.floor(points / 2));
      if(ranks <= 0) continue;
      draft.skillRankChanges[skillId] = already + ranks;
      points -= ranks * 2;
    }else{
      let ranks = Math.min(room, points);
      if(ranks <= 0) continue;
      draft.skillRankChanges[skillId] = already + ranks;
      points -= ranks;
    }
  }
  draft.skillPointsRemaining = points;
}

export function canChooseFeatOnDraft(
  hasFeat: (id: number) => boolean,
  draft: LevelUpDraft,
  featId: number
): boolean {
  if(featId < 0) return false;
  if(hasFeat(featId)) return false;
  if(draft.feats.indexOf(featId) >= 0) return false;
  return draft.featPicksRemaining > 0;
}

export function addFeatToDraft(draft: LevelUpDraft, featId: number): boolean {
  if(draft.featPicksRemaining <= 0) return false;
  if(draft.feats.indexOf(featId) >= 0) return false;
  draft.feats.push(featId);
  draft.featPicksRemaining--;
  return true;
}

export function addSpellToDraft(draft: LevelUpDraft, spellId: number): boolean {
  if(draft.powerPicksRemaining <= 0) return false;
  if(draft.spellsAdded.indexOf(spellId) >= 0) return false;
  draft.spellsAdded.push(spellId);
  draft.powerPicksRemaining--;
  return true;
}

export function validateLevelUpDraft(draft: LevelUpDraft): boolean {
  if(draft.classId < 0) return false;
  if(draft.hasAbilityStep && draft.attributeIndex < 0) return false;
  if(draft.hasFeatsStep && draft.featPicksRemaining > 0) return false;
  if(draft.hasPowersStep && draft.powerPicksRemaining > 0) return false;
  // Skills may leave leftover points (stores skill_points_remaining).
  return true;
}
