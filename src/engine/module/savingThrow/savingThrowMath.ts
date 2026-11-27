/**
 * Pure saving-throw arithmetic — numbers in, numbers out.
 * Callers resolve effect bonuses, dice rolls, and immunity checks.
 */

/** Getter total: GFF/static base + already-resolved effect bonus. */
export function combineSavingThrow(base: number, effectBonus: number): number {
  return (base | 0) + (effectBonus | 0);
}

/** Simple static-object roll result: 0 fail / 1 success. */
export function rollSavingThrow(base: number, nDC: number, d20: number): number {
  return (d20 | 0) + (base | 0) >= (nDC | 0) ? 1 : 0;
}

/** Map SAVING_THROW_TYPE_* (+ optional spell school) → immunity type id (or 0). */
export function savingThrowTypeToImmunity(saveType: number, lastSpellSchool?: number): number {
  switch(saveType | 0){
    case 10: return 1;
    case 12: return 2;
    case 5: return 3;
    case 8: return 4;
    case 14: return 5;
    case 4:
      if(lastSpellSchool === 1 || lastSpellSchool === 2) return 0x20;
      return 0;
    default: return 0;
  }
}
