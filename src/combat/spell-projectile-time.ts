/**
 * Retail CSWSObject::CalculateLastSpellProjectileTime @ 004cb9e0.
 *
 * Speed = ln(distance) * 3 + 2 (with path-type multipliers), then
 * flightMs = (distance / speed) * 1000. Path type 6 adds +2500 ms.
 */

import { ProjectilePath } from "@/enums/combat/ProjectilePath";

/** Retail path type 6 hang time after base flight (0x9C4). */
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

  // retail: ln(mag)*3+2 via 0.693147 * log2(mag) * 3 + 2
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
  // Retail checks spell path field == 6 after the switch (not only param)
  if(path === 6){
    ms += SPELL_PROJECTILE_PATH6_EXTRA_MS;
  }
  return Math.max(1, ms);
}

/** Map spells.2da projtype strings → retail path ids. */
const PROJTYPE_NAME_TO_PATH: Record<string, number> = {
  default: ProjectilePath.DEFAULT,
  homing: ProjectilePath.HOMING,
  ballistic: ProjectilePath.BALLISTIC,
  highballistic: ProjectilePath.HIGH_BALLISTIC,
  high_ballistic: ProjectilePath.HIGH_BALLISTIC,
  accelerating: ProjectilePath.ACCELERATING,
  linked: ProjectilePath.HOMING,
  path: ProjectilePath.DEFAULT,
  grenade: ProjectilePath.GRENADE,
  throw: ProjectilePath.GRENADE,
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
 * (retail range L / W, or explicit grenade / impactAtProjectileLanding).
 */
export function shouldDelaySpellImpactToLanding(
  spell: { range?: string; proj?: number; projtype?: unknown } | undefined,
  impactAtProjectileLanding: boolean = false
): boolean {
  if(impactAtProjectileLanding) return true;
  const range = String(spell?.range ?? '').toUpperCase();
  if(range === 'L' || range === 'W') return true;
  const path = resolveSpellProjectilePathType(spell?.projtype);
  return path === ProjectilePath.GRENADE || (spell?.proj | 0) === 1;
}
