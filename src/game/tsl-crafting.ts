/**
 * TSL workbench / chemical helpers — retail create-item / create-medical cost rules.
 *
 * Chemical create cost: max(1, GetCost() >> 1)
 * Component create/breakdown piece value: max(1, GetCost() / 20)
 * NWScript GetChemicalPieceValue / GetItemComponentPieceValue: GetCost() / 20
 */

export const CHEMICAL_CREATE_GROUPS = {
  HEALTH: 0,
  STIMS: 1,
  GRENADES: 2,
  MINES: 3,
} as const;

export const COMPONENT_CREATE_GROUPS = {
  RANGED: 0,
  MELEE: 1,
  ARMOR: 2,
  LIGHTSABER: 3,
  MISC: 4,
} as const;

/** Treat Injury — GUI skill rank for discount UI. */
export const SKILL_TREAT_INJURY = 7;

export function chemicalCreateCost(goldPieceValue: number): number {
  const half = (goldPieceValue | 0) >>> 1;
  return half < 1 ? 1 : half;
}

export function componentPieceValue(goldPieceValue: number): number {
  const pieces = Math.floor((goldPieceValue | 0) / 20);
  return pieces < 1 ? 1 : pieces;
}

/** NWScript GetChemicalPieceValue / GetItemComponentPieceValue — integer divide, may be 0. */
export function nwscriptPieceValue(goldPieceValue: number): number {
  return Math.floor((goldPieceValue | 0) / 20);
}

export function treatInjuryDiscountFactor(skillRank: number): number {
  const f = (skillRank | 0) / 20;
  return f >= 1 ? 1 : f;
}

export interface CraftRecipeRow {
  rowIndex: number;
  label: string;
  group: number;
  skillLevel: number;
  baseSkill: number;
  /** ItemCreate only */
  skill?: number;
  level?: number;
  align?: number;
}

export function parseChemicalCreateRow(row: any, rowIndex: number): CraftRecipeRow | undefined {
  if(!row) return undefined;
  const label = String(row.label ?? row.Label ?? '').trim();
  if(!label || label === '****') return undefined;
  return {
    rowIndex,
    label,
    group: parseInt(row.group ?? row.Group ?? '0', 10) | 0,
    skillLevel: parseInt(row.skillLevel ?? row.skilllevel ?? '0', 10) | 0,
    baseSkill: parseInt(row.base_skill ?? row.baseSkill ?? '0', 10) | 0,
  };
}

export function parseItemCreateRow(row: any, rowIndex: number): CraftRecipeRow | undefined {
  if(!row) return undefined;
  const label = String(row.label ?? row.Label ?? '').trim();
  if(!label || label === '****') return undefined;
  return {
    rowIndex,
    label,
    group: parseInt(row.group ?? row.Group ?? '0', 10) | 0,
    skillLevel: parseInt(row.skill ?? row.Skill ?? '0', 10) | 0,
    baseSkill: parseInt(row.base_skill ?? row.baseSkill ?? '0', 10) | 0,
    skill: parseInt(row.skill ?? row.Skill ?? '0', 10) | 0,
    level: parseInt(row.level ?? row.Level ?? '0', 10) | 0,
    align: parseInt(row.align ?? row.Align ?? '0', 10) | 0,
  };
}

/** Retail SetItemList gate: skillLevel <= GetSkillRank(base_skill) + 8 && group match. */
export function chemicalRecipeVisible(
  recipe: CraftRecipeRow,
  group: number,
  getSkillRank: (skill: number) => number
): boolean {
  if(recipe.group !== group) return false;
  return recipe.skillLevel <= (getSkillRank(recipe.baseSkill) | 0) + 8;
}

/** Retail ItemCreate SetItemList gate (group + skill+8 + optional level/align). */
export function itemCreateRecipeVisible(
  recipe: CraftRecipeRow,
  group: number,
  getSkillRank: (skill: number) => number,
  creatureLevel: number,
  alignBucket: number
): boolean {
  if(recipe.group !== group) return false;
  const skillReq = recipe.skill ?? recipe.skillLevel;
  if(skillReq > (getSkillRank(recipe.baseSkill) | 0) + 8) return false;
  if((recipe.level | 0) > 0 && (recipe.level | 0) > (creatureLevel | 0)) return false;
  if((recipe.align | 0) > 0 && (recipe.align | 0) !== (alignBucket | 0)) return false;
  return true;
}

/**
 * Good/Evil alignment bucket for ItemCreate `align` column.
 * Retail uses short at stats thresholds 0x29 / 0x3c → buckets 3 / 1 / 2.
 */
export function itemCreateAlignBucket(goodEvil: number): number {
  const ge = goodEvil | 0;
  if(ge < 0x29) return 3;
  if(ge < 0x3c) return 1;
  return 2;
}
