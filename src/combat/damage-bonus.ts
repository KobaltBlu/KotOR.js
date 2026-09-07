import { GameState } from "@/GameState";
import { Dice } from "@/utility/Dice";
import { DamageType } from "@/enums/combat/DamageType";

/**
 * DAMAGE_BONUS_* → iprp_damagecost.2da (K1 GetTotalEffectBonus case 2,
 * Massive Critical / shields via same table).
 *
 * KotOR rows: 1–5 flat (+code); ≥6 use NumDice/Die. K2 adds extra dice rows.
 */

export type ResolveDamageBonusOptions = {
  /** When true, use NumDice*Die instead of rolling */
  maximize?: boolean;
  /** Critical hit: roll / maximize this many times (crit path) */
  critMultiplier?: number;
};

/**
 * Resolve a DAMAGE_BONUS_* / iprp_damagecost row index to a damage amount.
 */
export function resolveDamageBonusCode(
  code: number,
  options: ResolveDamageBonusOptions = {}
): number {
  const codeInt = code | 0;
  if(codeInt <= 0) return 0;

  const mult = Math.max(1, options.critMultiplier ?? 1);
  let total = 0;
  for(let i = 0; i < mult; i++){
    total += resolveDamageBonusCodeOnce(codeInt, options.maximize === true);
  }
  return total;
}

function resolveDamageBonusCodeOnce(code: number, maximize: boolean): number {
  // : codes 1..5 add the code as a flat bonus (row index == amount)
  if(code > 0 && code < 6){
    return code;
  }

  const table = GameState.TwoDAManager?.datatables?.get('iprp_damagecost');
  const row = table?.rows?.[code];
  if(!row){
    return 0;
  }

  const numDiceRaw = row.numdice;
  const dieRaw = row.die;
  const numDice = parseInt(numDiceRaw, 10);
  const die = parseInt(dieRaw, 10);
  const hasDice =
    numDiceRaw != null &&
    String(numDiceRaw) !== '****' &&
    !isNaN(numDice) &&
    numDice > 0 &&
    dieRaw != null &&
    String(dieRaw) !== '****' &&
    !isNaN(die) &&
    die > 0;

  if(hasDice){
    if(maximize) return numDice * die;
    return Dice.roll(numDice, Dice.intToDiceType(die));
  }

  // Flat row with empty NumDice: prefer Label (matches ItemProperty.getValue)
  const label = parseInt(row.label, 10);
  if(!isNaN(label) && label > 0) return label;
  return 0;
}

/**
 * NWScript DAMAGE_TYPE_* bitflag → damageList channel index.
 * uses log2(flags) for a single set bit.
 */
export function damageTypeFlagToChannel(flags: number): number {
  const f = flags | 0;
  if(!f) return DamageType.BASE;
  for(let i = 0; i < 16; i++){
    if(f & (1 << i)) return i;
  }
  return DamageType.BASE;
}

/**
 * Read NumDice/Die from a cost-table row object (shared with ItemProperty).
 */
export function resolveDamageBonusFromRow(
  row: any,
  options: ResolveDamageBonusOptions = {}
): number {
  if(!row) return 0;
  const numDiceRaw = row.numdice;
  const dieRaw = row.die;
  const numDice = parseInt(numDiceRaw, 10);
  const die = parseInt(dieRaw, 10);
  const hasDice =
    numDiceRaw != null &&
    String(numDiceRaw) !== '****' &&
    !isNaN(numDice) &&
    numDice > 0 &&
    dieRaw != null &&
    String(dieRaw) !== '****' &&
    !isNaN(die) &&
    die > 0;

  const mult = Math.max(1, options.critMultiplier ?? 1);
  if(hasDice){
    let total = 0;
    for(let i = 0; i < mult; i++){
      total += options.maximize ? numDice * die : Dice.roll(numDice, Dice.intToDiceType(die));
    }
    return total;
  }
  const label = parseInt(row.label, 10);
  return !isNaN(label) && label > 0 ? label * mult : 0;
}
