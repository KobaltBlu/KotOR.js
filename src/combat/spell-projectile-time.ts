/**
 * CalculateLastSpellProjectileTime.
 *
 * Speed = ln(distance) * 3 + 2 (with path-type multipliers), then
 * flightMs = (distance / speed) * 1000. Path type 6 adds +2500 ms.
 */

import { ProjectilePath } from "@/enums/combat/ProjectilePath";

/** path type 6 hang time after base flight (0x9C4). */
export const SPELL_PROJECTILE_PATH6_EXTRA_MS = 2500;

/**
 * @param distance - world units from caster to impact
 * @param pathType - spells.2da projectile path (0–8); 0 uses default speed
 */
export function calculateLastSpellProjectileTimeMs(
  distance: number,
  pathType: number = 0
): number {
  const mag = Math.max(0, distance);
  if(!(mag > 0)){
    return 1;
  }

  // : ln(mag)*3+2 via 0.693147 * log2(mag) * 3 + 2
  let speed = Math.log(mag) * 3.0 + 2.0;
  const path = pathType | 0;

  switch(path){
    case 1:
      speed = speed + speed;
      break;
    case 3:
      return 2000;
    case 5:
      speed = speed * 1.5;
      break;
    case 7:
      speed = mag * 0.5;
      break;
    case 8:
      speed = speed * 0.4;
      break;
    default:
      break;
  }

  if(!(speed > 0)){
    return 1;
  }

  let ms = Math.floor((mag / speed) * 1000);
  // checks spell path field == 6 after the switch (not only param)
  if(path === 6){
    ms += SPELL_PROJECTILE_PATH6_EXTRA_MS;
  }
  return Math.max(1, ms);
}

/** Map spells.2da projtype strings → path ids. */
const PROJTYPE_NAME_TO_PATH: Record<string, number> = {
  default: ProjectilePath.DEFAULT,
  homing: ProjectilePath.HOMING,
  ballistic: ProjectilePath.BALLISTIC,
  highballistic: ProjectilePath.HIGH_BALLISTIC,
  high_ballistic: ProjectilePath.HIGH_BALLISTIC,
  accelerating: ProjectilePath.ACCELERATING,
  spiral: ProjectilePath.SPIRAL,
  linked: ProjectilePath.LINKED,
  bounce: ProjectilePath.BOUNCE,
  path: ProjectilePath.DEFAULT,
  grenade: ProjectilePath.GRENADE,
};

/** Parse TalentSpell.projtype / 2DA path id (number or named string). */
export function resolveSpellProjectilePathType(projtype: unknown): number {
  if(typeof projtype === 'number' && Number.isFinite(projtype)){
    return projtype | 0;
  }
  const raw = String(projtype ?? '').trim().toLowerCase();
  if(!raw || raw === '****'){
    return ProjectilePath.DEFAULT;
  }
  const n = parseInt(raw, 10);
  if(Number.isFinite(n)){
    return n;
  }
  const named = PROJTYPE_NAME_TO_PATH[raw.replace(/\s+/g, '')];
  return named !== undefined ? named : ProjectilePath.DEFAULT;
}

/**
 * Whether SpellCastAndImpact should delay impact until projectile landing
 * (range L / W, or explicit grenade / impactAtProjectileLanding).
 * CalculateLastSpellProjectileTime: proj==0 → no travel delay.
 */
export function shouldDelaySpellImpactToLanding(
  spell: { range?: string; proj?: number; projtype?: unknown } | undefined,
  impactAtProjectileLanding: boolean = false
): boolean {
  // Explicit caller request (grenade hand-release / throw) wins over proj==0.
  if(impactAtProjectileLanding) return true;
  // Explicit spells.2da proj==0 → no projectile / immediate impact
  if(spellHasProjectileFlag(spell) && (spell!.proj | 0) === 0){
    return false;
  }
  const range = String(spell?.range ?? '').toUpperCase();
  if(range === 'L' || range === 'W') return true;
  const path = resolveSpellProjectilePathType(spell?.projtype);
  return path === ProjectilePath.GRENADE || (spell?.proj | 0) === 1;
}

/** True when the spell object carries an explicit numeric proj field. */
function spellHasProjectileFlag(
  spell: { proj?: number } | undefined
): boolean {
  return !!spell && typeof spell.proj === 'number';
}

/**
 * CalculateLastSpellProjectileTime entry: proj==0 → delay 0.
 * Otherwise flight ms from distance + path (path 6 adds +2500).
 */
export function calculateSpellProjectileImpactDelayMs(
  spell: { proj?: number; projtype?: unknown } | undefined,
  distance: number,
  pathOverride: number = -1
): number {
  if(spellHasProjectileFlag(spell) && (spell!.proj | 0) === 0){
    return 0;
  }
  const pathType =
    pathOverride >= 0
      ? pathOverride
      : resolveSpellProjectilePathType(spell?.projtype);
  return calculateLastSpellProjectileTimeMs(distance, pathType);
}
