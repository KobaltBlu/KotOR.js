import type { ModuleObject } from '@/module/ModuleObject';

/**
 * Parse spells.2da FORCEHOSTILE / FORCEFRIENDLY cell.
 * **** / missing → -1 (not on that menu).
 */
export function parseForceMenuIndex(raw: unknown): number {
  if(typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if(raw === '****' || raw == null || raw === '') return -1;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : -1;
}

/**
 * Whether a cast should bind to the caster (retail GetSelfForcePowers /
 * ForceMenuAction self stamp, or spells.2da range P).
 *
 * - Range `P` (personal): always the caster
 * - FORCEFRIENDLY-only powers (no FORCEHOSTILE): self-menu powers — user casts
 *   always hit the controlled creature, never the look-at target
 */
export function shouldBindSpellCastToCaster(
  spell: {
    range?: string;
    forcehostile?: number | string;
    forcefriendly?: number | string;
  } | undefined | null,
  opts?: { isUserAction?: boolean }
): boolean {
  if(!spell) return false;
  const rangeKey = String(spell.range || '').toUpperCase();
  if(rangeKey === 'P') return true;

  const hostile = parseForceMenuIndex(spell.forcehostile);
  const friendly = parseForceMenuIndex(spell.forcefriendly);
  const friendlyOnly = hostile < 0 && friendly >= 0;
  return !!(opts?.isUserAction && friendlyOnly);
}

/**
 * Resolve cast target after optional self-bind.
 */
export function resolveSpellCastTarget(
  spell: {
    range?: string;
    forcehostile?: number | string;
    forcefriendly?: number | string;
  } | undefined | null,
  oTarget: ModuleObject | undefined,
  oCaster: ModuleObject,
  opts?: { isUserAction?: boolean }
): ModuleObject {
  if(shouldBindSpellCastToCaster(spell, opts)){
    return oCaster;
  }
  return oTarget || oCaster;
}
