/**
 * GFF-shaped row helpers for UTC editor fallbacks when 2DA / SWRuleSet tables are empty.
 *
 * @file utcGffList.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface UtcGffFeatRow {
  Feat: number;
}

export interface UtcGffSkillRankRow {
  Rank: number;
}

export interface UtcFeatLike {
  label?: string;
  prereqFeat1?: number;
  prereqFeat2?: number;
}

export interface UtcSpellLike {
  userType?: number;
  prerequisites?: number[];
}

export interface UtcClassLike {
  label?: string;
}

export function utcRuleSetHasFeatGrid(feats: UtcFeatLike[] | undefined): boolean {
  return (feats || []).some((feat) => feat?.label != '' && feat.prereqFeat2 == -1 && feat.prereqFeat1 == -1);
}

export function utcRuleSetHasSpellGrid(spells: UtcSpellLike[] | undefined, userType: 1 | 2): boolean {
  return (spells || []).some((spell) => spell?.userType == userType && (spell.prerequisites || []).length == 0);
}

export function utcRuleSetHasClassOptions(classes: UtcClassLike[] | undefined): boolean {
  return (classes || []).some((cls) => !!cls?.label);
}

export function utcRuleSetHasSkillGrid(skills: unknown[] | undefined): boolean {
  return (skills || []).length > 0;
}

export function featIdsToGffRows(ids: number[] | undefined): UtcGffFeatRow[] {
  return (ids || []).map((Feat) => ({ Feat: Feat || 0 }));
}

export function featGffRowsToIds(rows: UtcGffFeatRow[] | undefined): number[] {
  return (rows || []).map((row) => row.Feat || 0);
}

export function skillRanksToGffRows(ranks: number[] | undefined): UtcGffSkillRankRow[] {
  return (ranks || []).map((Rank) => ({ Rank: Rank || 0 }));
}

export function skillGffRowsToRanks(rows: UtcGffSkillRankRow[] | undefined): number[] {
  return (rows || []).map((row) => row.Rank || 0);
}

export const UTC_FEAT_GFF_COLUMNS = [{ key: "Feat" as const, label: "Feat" }];
export const UTC_KNOWN_SPELL_GFF_COLUMNS = [
  { key: "spell" as const, label: "Spell" },
  { key: "spellMetaMagic" as const, label: "SpellMetaMagic" },
  { key: "spellFlags" as const, label: "SpellFlags" },
];
export const UTC_SPEC_ABILITY_GFF_COLUMNS = [
  { key: "spell" as const, label: "Spell" },
  { key: "spellCasterLevel" as const, label: "SpellCasterLevel" },
  { key: "spellFlags" as const, label: "SpellFlags" },
];
export const UTC_CLASS_GFF_COLUMNS = [
  { key: "class" as const, label: "Class" },
  { key: "level" as const, label: "ClassLevel" },
];
export const UTC_SKILL_GFF_COLUMNS = [{ key: "Rank" as const, label: "Rank" }];
