import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import type { TalentSpell } from "@/talents/TalentSpell";

/** Appearance racialtype 5 (droid) — retail global. */
export const APPEARANCE_RACIALTYPE_DROID = 5;
/** Appearance racialtype 6 — retail global. */
export const APPEARANCE_RACIALTYPE_ALT = 6;

/** Spell exclusion flags passed into GetMenuInfo (GetHostileForcePowers). */
export const ForceMenuExclusion = {
  NONE: 0,
  /** Target appearance racialtype == 6 */
  RACIALTYPE_ALT: 1,
  /** Target appearance racialtype == 5 (droid) */
  DROID: 2,
  /** Target is not a creature */
  NON_CREATURE: 4,
} as const;

/** GetMenuInfo category from packed FORCEHOSTILE / FORCEFRIENDLY encoding. */
export const ForceMenuCategory = {
  HOSTILE: 1,
  PASSIVE: 2,
  FRIENDLY: 3,
} as const;

/**
 * K1 ranges.2da secondary values used by GetMinSpellRange.
 * P/T share Touch (row 1); W uses Throw row 19.
 */
const FORCE_MENU_MIN_RANGE_FALLBACK: Record<string, number> = {
  P: 0,
  T: 0,
  S: 0,
  M: 0,
  L: 0,
  W: 5,
};

type ForceMenuMode = 'hostile' | 'friendly';

export interface ForceMenuSpellEntry {
  spell: TalentSpell;
  /** Equipped item that owns this power (droid GetEquipmentForcePowers). */
  item?: ModuleItem;
  sortIndex: number;
  priority: number;
}

function isCreatureLike(target: ModuleObject | undefined): target is ModuleCreature {
  return !!(target && typeof (target as ModuleCreature).getAppearance === 'function');
}

/**
 * Retail GetHostileForcePowers tmp14 — exclusion bits for the current target.
 */
export function getHostileTargetExclusionFlags(target: ModuleObject | undefined): number {
  if(!isCreatureLike(target)){
    return ForceMenuExclusion.NON_CREATURE;
  }
  const racialtype = target.getAppearance()?.racialtype ?? -1;
  if(racialtype === APPEARANCE_RACIALTYPE_DROID){
    return ForceMenuExclusion.DROID;
  }
  if(racialtype === APPEARANCE_RACIALTYPE_ALT){
    return ForceMenuExclusion.RACIALTYPE_ALT;
  }
  return ForceMenuExclusion.NONE;
}

/** Retail: include when `(spell.exclusion & flags) == 0`. */
export function spellPassesForceMenuExclusion(spell: TalentSpell, flags: number): boolean {
  return ((spell.exclusion | 0) & (flags | 0)) === 0;
}

/**
 * retail secondary_ranges used by GetMinSpellRange.
 * P and T both use Touch secondary; W uses Throw secondary.
 */
export function resolveForceMenuMinRange(rangeLetter: string): number {
  const key = (rangeLetter || '').toUpperCase();
  if(Object.prototype.hasOwnProperty.call(FORCE_MENU_MIN_RANGE_FALLBACK, key)){
    return FORCE_MENU_MIN_RANGE_FALLBACK[key];
  }
  return 0;
}

/**
 * Retail GetMenuInfo range gate: disable when secondary > 0 and
 * distanceSq <= secondary² (too close). Max/primary range is not checked here.
 */
export function isWithinForceMenuMinRange(rangeLetter: string, distanceSq: number): boolean {
  const minRange = resolveForceMenuMinRange(rangeLetter);
  if(!(minRange > 0)) return true;
  return distanceSq > minRange * minRange;
}

/** Retail forbid/require item-mask checks from GetMenuInfo. */
export function passesForceItemMask(spell: TalentSpell, forceItemMask: number): boolean {
  const forbid = spell.forbiditemmask | 0;
  const require = spell.requireitemmask | 0;
  if((forbid & forceItemMask) !== 0) return false;
  if((require & forceItemMask) !== require) return false;
  return true;
}

export function isForceMenuSpellEnabled(
  spell: TalentSpell,
  opts: {
    resource: number;
    cost: number;
    distanceSq: number;
    forceItemMask: number;
  }
): boolean {
  if(opts.cost > opts.resource) return false;
  if(!isWithinForceMenuMinRange(spell.range, opts.distanceSq)) return false;
  if(!passesForceItemMask(spell, opts.forceItemMask)) return false;
  return true;
}

function sortKeyForMode(spell: TalentSpell, mode: ForceMenuMode): number {
  const raw = mode === 'hostile' ? spell.forcehostile : spell.forcefriendly;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : -1;
}

function priorityOf(spell: TalentSpell): number {
  const p = spell.forcepriority;
  if(typeof p !== 'number' || !Number.isFinite(p) || p < 0) return 0;
  return p | 0;
}

/**
 * Retail GetMenuInfo known-spell pass: filter by menu column + exclusion,
 * keep highest FORCEPRIORITY per sort index, ascending sort order.
 */
export function buildForceMenuSpellList(
  spells: TalentSpell[],
  mode: ForceMenuMode,
  exclusionFlags: number = ForceMenuExclusion.NONE
): ForceMenuSpellEntry[] {
  const bySort = new Map<number, ForceMenuSpellEntry>();

  for(let i = 0; i < spells.length; i++){
    const spell = spells[i];
    if(!spell) continue;
    const sortIndex = sortKeyForMode(spell, mode);
    if(sortIndex < 0) continue;
    if(!spellPassesForceMenuExclusion(spell, exclusionFlags)) continue;

    const priority = priorityOf(spell);
    const existing = bySort.get(sortIndex);
    if(!existing || existing.priority < priority){
      bySort.set(sortIndex, { spell, sortIndex, priority });
    }
  }

  return Array.from(bySort.values()).sort((a, b) => a.sortIndex - b.sortIndex);
}

/**
 * Retail caster appearance.racialtype == 5 → GetEquipmentForcePowers for hostile menu.
 */
export function isDroidForceMenuCaster(creature: ModuleCreature | undefined): boolean {
  if(!creature) return false;
  return creature.getAppearance()?.racialtype === APPEARANCE_RACIALTYPE_DROID;
}

const EQUIP_FORCE_SLOTS: (keyof ModuleCreature['equipment'])[] = [
  'HEAD', 'ARMOR', 'ARMS', 'RIGHTHAND', 'LEFTHAND',
  'LEFTARMBAND', 'RIGHTARMBAND', 'IMPLANT', 'BELT',
  'RIGHTHAND2', 'LEFTHAND2', 'CLAW1', 'CLAW2', 'CLAW3',
];

/**
 * Retail GetEquipmentForcePowers — hostile (category 1) powers from equipped items.
 */
export function buildEquipmentForceMenuSpellList(
  creature: ModuleCreature,
  exclusionFlags: number
): ForceMenuSpellEntry[] {
  const collected: TalentSpell[] = [];
  const itemBySpellId = new Map<number, ModuleItem>();

  for(let i = 0; i < EQUIP_FORCE_SLOTS.length; i++){
    const item = creature.equipment[EQUIP_FORCE_SLOTS[i]] as ModuleItem | undefined;
    if(!item?.getSpells) continue;
    const spells = item.getSpells() || [];
    for(let j = 0; j < spells.length; j++){
      const spell = spells[j];
      if(!spell || sortKeyForMode(spell, 'hostile') < 0) continue;
      if(!spellPassesForceMenuExclusion(spell, exclusionFlags)) continue;
      collected.push(spell);
      itemBySpellId.set(spell.id, item);
    }
  }

  const list = buildForceMenuSpellList(collected, 'hostile', exclusionFlags);
  for(let i = 0; i < list.length; i++){
    list[i].item = itemBySpellId.get(list[i].spell.id);
  }
  return list;
}
