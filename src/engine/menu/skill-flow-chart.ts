/**
 * retail membership for the in-game abilities menu.
 *
 * Anchors (K1 `/K1/k1_win_gog_swkotor.exe`):
 * - BuildSortedFeatList
 * - CreateFeatChart (in-game) — SetCharacter
 * - BuildSortedPowerList
 * - CreatePowerChart — CreatePowerList arg2=0
 * - Subradial encode in Load
 *
 * @file skill-flow-chart.ts
 */

import type { TalentFeat } from "@/talents/TalentFeat";
import type { TalentSpell } from "@/talents/TalentSpell";

/** Minimal creature surface used by in-game chart builders. */
export type SkillFlowCreature = {
  getHasFeat?: (id: number) => boolean;
  getHasSpell?: (id: number) => boolean;
  getFP?: () => number;
  getAdjustedForcePointCost?: (spell: {
    forcepoints?: number;
    goodEvil?: string;
  }) => number;
};

export type SpellSubRadialFields = {
  forcehostile?: number;
  forcefriendly?: number;
  forcepassive?: number;
  forcepriority?: number;
};

const UNSET_PREREQ = -1;

function isUnsetPrereq(id: number | null | undefined): boolean {
  if (id == null) return true;
  const n = id | 0;
  return n < 0 || n === 0xffffffff;
}

/**
 * Retail feat chain depth for BuildSortedFeatList:
 * 0 = root (no prereqFeat1), 1 = mid (prereqFeat2 unset), 2 = end.
 */
export function featChainDepth(feat: {
  prereqFeat1?: number;
  prereqFeat2?: number;
}): number {
  if (isUnsetPrereq(feat.prereqFeat1)) return 0;
  if (isUnsetPrereq(feat.prereqFeat2)) return 1;
  return 2;
}

/**
 * Retail BuildSortedFeatList — feats with name != 0, ordered by depth ascending.
 */
export function buildSortedFeatIds(feats: readonly (TalentFeat | undefined | null)[]): number[] {
  const sorted: number[] = [];
  for (let i = 0; i < feats.length; i++) {
    const feat = feats[i];
    if (!feat) continue;
    const nameRef = typeof feat.name === "number" ? feat.name : parseInt(String(feat.name), 10);
    if (!nameRef) continue;

    const depth = featChainDepth(feat);
    let inserted = false;
    for (let j = 0; j < sorted.length; j++) {
      const other = feats[sorted[j]];
      if (!other) continue;
      if (depth < featChainDepth(other)) {
        sorted.splice(j, 0, i);
        inserted = true;
        break;
      }
    }
    if (!inserted) sorted.push(i);
  }
  return sorted;
}

/**
 * Retail CreateFeatChart (in-game).
 * Known roots only; mid/end only when HasFeat. Sparse [root, mid?, end?].
 */
export function createInGameFeatChart(
  creature: SkillFlowCreature,
  feats: readonly (TalentFeat | undefined | null)[] = [],
): (TalentFeat | undefined)[][] {
  const sorted = buildSortedFeatIds(feats);
  const groups: (TalentFeat | undefined)[][] = [];

  for (let si = 0; si < sorted.length; si++) {
    const rootId = sorted[si];
    const root = feats[rootId];
    if (!root) continue;

    if (!isUnsetPrereq(root.prereqFeat1)) {
      break; // past contiguous root block
    }

    if (!creature.getHasFeat?.(rootId)) continue;

    let mid: TalentFeat | undefined;
    let end: TalentFeat | undefined;
    for (let j = si + 1; j < sorted.length; j++) {
      if (mid && end) break;
      const childId = sorted[j];
      const child = feats[childId];
      if (!child) continue;
      if ((child.prereqFeat1 | 0) !== rootId) continue;
      if (!creature.getHasFeat?.(childId)) continue;

      if (isUnsetPrereq(child.prereqFeat2)) {
        mid = child;
      } else {
        end = child;
      }
    }

    const group: (TalentFeat | undefined)[] = [root];
    if (mid) group[1] = mid;
    if (end) group[2] = end;
    groups.push(group);
  }

  return groups;
}

/**
 * Retail Load subradial encode.
 * Returns the first radial key (FORCEFRIENDLY, then HOSTILE, then PASSIVE order in Load).
 * -1 when no force menu column is set.
 */
export function encodeSpellSubRadial(spell: SpellSubRadialFields): number {
  const priority = Number.isFinite(spell.forcepriority as number) && (spell.forcepriority as number) >= 0
    ? (spell.forcepriority as number) | 0
    : 0;

  // Load builds an array; GetSubRadialSpell(0) is the first entry written.
  // Order in Load: FRIENDLY first (if present), then HOSTILE, then PASSIVE.
  if (Number.isFinite(spell.forcefriendly as number) && (spell.forcefriendly as number) >= 0) {
    return ((spell.forcefriendly as number) * 5 + 1500) * 2 + priority;
  }
  if (Number.isFinite(spell.forcehostile as number) && (spell.forcehostile as number) >= 0) {
    return ((spell.forcehostile as number) * 5 + 500) * 2 + priority;
  }
  if (Number.isFinite(spell.forcepassive as number) && (spell.forcepassive as number) >= 0) {
    return ((spell.forcepassive as number) * 5 + 1000) * 2 + priority;
  }
  return -1;
}

/** Retail GetPriority */
export function spellSubRadialPriority(key: number): number {
  if (key < 0) return -1;
  return key % 10;
}

/** Retail GetSlot */
export function spellSubRadialSlot(key: number): number {
  if (key < 0) return -1;
  return Math.floor((key % 1000) / 10);
}

/** Thousands digit — hostile≈1, passive≈2, friendly≈3 */
export function spellSubRadialFamily(key: number): number {
  if (key < 0) return -1;
  return Math.floor(key / 1000);
}

function spellUserType(spell: TalentSpell | { userType?: number; usertype?: number }): number {
  const raw = (spell as TalentSpell).userType ?? (spell as any).usertype;
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? 0), 10);
  return Number.isFinite(n) ? n : 0;
}

function spellNameRef(spell: TalentSpell | { name?: number }): number {
  const n = typeof spell.name === "number" ? spell.name : parseInt(String(spell.name ?? 0), 10);
  return Number.isFinite(n) ? n : 0;
}

function spellIdOf(spell: TalentSpell, fallbackIndex: number): number {
  if (typeof spell.id === "number" && Number.isFinite(spell.id)) return spell.id | 0;
  const row = (spell as any).__index ?? (spell as any).__rowlabel;
  if (typeof row === "number" && Number.isFinite(row)) return row | 0;
  return fallbackIndex | 0;
}

/**
 * Retail BuildSortedPowerList — usertype==1, name!=0;
 * sort by priority, then family, then slot.
 */
export function buildSortedPowerIds(spells: readonly (TalentSpell | undefined | null)[]): number[] {
  const sorted: number[] = [];
  for (let i = 0; i < spells.length; i++) {
    const spell = spells[i];
    if (!spell) continue;
    if (spellUserType(spell) !== 1) continue;
    if (!spellNameRef(spell)) continue;

    const key = encodeSpellSubRadial(spell);
    // Missing subradial sorts like retail unsigned 0xffffffff priority (before 0).
    const pri = key < 0 ? -1 : spellSubRadialPriority(key);
    const fam = key < 0 ? -1 : spellSubRadialFamily(key);
    const slot = key < 0 ? -1 : spellSubRadialSlot(key);

    let inserted = false;
    for (let j = 0; j < sorted.length; j++) {
      const other = spells[sorted[j]];
      if (!other) continue;
      const oKey = encodeSpellSubRadial(other);
      const oPri = spellSubRadialPriority(oKey);
      if (pri < oPri) {
        sorted.splice(j, 0, i);
        inserted = true;
        break;
      }
      if (pri === oPri) {
        const oFam = spellSubRadialFamily(oKey);
        if (fam < oFam) {
          sorted.splice(j, 0, i);
          inserted = true;
          break;
        }
        if (fam === oFam) {
          const oSlot = spellSubRadialSlot(oKey);
          if (slot < oSlot) {
            sorted.splice(j, 0, i);
            inserted = true;
            break;
          }
        }
      }
    }
    if (!inserted) sorted.push(i);
  }
  return sorted;
}

function hasSpellKnown(creature: SkillFlowCreature, id: number): boolean {
  return !!creature.getHasSpell?.(id);
}

/**
 * Retail HasSpell with arg3 != 0:
 * known and adjusted force cost ≤ current FP.
 */
function hasSpellAffordable(
  creature: SkillFlowCreature,
  spell: TalentSpell,
  id: number,
): boolean {
  if (!hasSpellKnown(creature, id)) return false;
  const cost = typeof creature.getAdjustedForcePointCost === "function"
    ? creature.getAdjustedForcePointCost({
        forcepoints: spell.forcepoints,
        goodEvil: spell.goodEvil,
      })
    : (spell.forcepoints | 0);
  const fp = typeof creature.getFP === "function" ? creature.getFP() : 0;
  return cost <= fp;
}

/**
 * Retail root test in CreatePowerChart: ones digit == 0, OR GetPriority < 0
 * (no subradial → 0xffffffff → signed priority < 0).
 */
export function isSpellChartRoot(key: number): boolean {
  if (key < 0) return true;
  return spellSubRadialPriority(key) === 0;
}

/**
 * Retail CreatePowerChart with arg2=0 (in-game abilities).
 * Roots: known + root priority. Children: same family/slot; HasSpell afford gate.
 * Sparse [root, mid?, end?].
 */
export function createInGamePowerChart(
  creature: SkillFlowCreature,
  spells: readonly (TalentSpell | undefined | null)[] = [],
): (TalentSpell | undefined)[][] {
  const sorted = buildSortedPowerIds(spells);
  const groups: (TalentSpell | undefined)[][] = [];

  for (let si = 0; si < sorted.length; si++) {
    const rootIndex = sorted[si];
    const root = spells[rootIndex];
    if (!root) continue;

    const rootKey = encodeSpellSubRadial(root);
    // Contiguous root block ends at first mid/end (priority 1+).
    if (!isSpellChartRoot(rootKey)) {
      break;
    }

    const rootId = spellIdOf(root, rootIndex);
    if (!hasSpellKnown(creature, rootId)) continue;

    const rootFam = spellSubRadialFamily(rootKey);
    const rootSlot = spellSubRadialSlot(rootKey);
    let mid: TalentSpell | undefined;
    let end: TalentSpell | undefined;

    // Orphans with no force columns still get a single-slot row (no children).
    if (rootKey >= 0) {
      for (let j = si + 1; j < sorted.length; j++) {
        if (mid && end) break;
        const childIndex = sorted[j];
        const child = spells[childIndex];
        if (!child) continue;

        const childId = spellIdOf(child, childIndex);
        if (!hasSpellAffordable(creature, child, childId)) continue;

        const childKey = encodeSpellSubRadial(child);
        if (childKey < 0) continue;
        if (spellSubRadialFamily(childKey) !== rootFam) continue;
        if (spellSubRadialSlot(childKey) !== rootSlot) continue;

        const childPri = spellSubRadialPriority(childKey);
        if (childPri === 1) {
          mid = child;
        } else if (childPri === 2) {
          end = child;
        }
      }
    }

    const group: (TalentSpell | undefined)[] = [root];
    if (mid) group[1] = mid;
    if (end) group[2] = end;
    groups.push(group);
  }

  return groups;
}
