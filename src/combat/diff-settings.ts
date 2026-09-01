import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";

/**
 * Retail DiffSettings.2da + GetWeightedDamageAmount
 * LoadDifficultyInfo / GetDamageRoll.
 *
 * @file diff-settings.ts
 */

/** DiffSettings row indices (LoadDifficultyInfo packs 6 options × difficulty). */
export enum DiffSettingsOption {
  NoCriticalOnPC = 0,
  NoAoOWithRanged = 1,
  NoAoOWithPotion = 2,
  MinPCDamagePercent = 3,
  MaxNPCDamagePercent = 4,
  MinHP1 = 5,
}

/** DiffSettings data columns → currentDifficulty index (skips `name`). */
const DIFF_SETTINGS_COLS = ['dmeasy', 'easy', 'normal', 'hardcore', 'dmplayers'] as const;

/**
 * Retail CSWRules::GetDifficultyOption(option, difficulty) —
 * DiffSettings[option][difficulty+1], **** → 0.
 */
export function getDifficultyOption(option: DiffSettingsOption): number {
  const table = GameState.TwoDAManager?.datatables?.get('diffsettings');
  const difficulty = GameState.SWRuleSet?.currentDifficulty ?? 1;
  const col = DIFF_SETTINGS_COLS[difficulty] ?? DIFF_SETTINGS_COLS[1];
  const row = table?.rows?.[option];
  if(!row) return 0;
  const raw = row[col];
  if(raw == null || String(raw) === '****') return 0;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * difficultyopt.2da MULTIPLIER for the active difficulty (DoDamage party scale).
 */
export function getDifficultyOptMultiplier(): number {
  const difficulty = GameState.SWRuleSet?.currentDifficulty ?? 1;
  const row = GameState.SWRuleSet?.difficulty?.[difficulty];
  if(row && typeof row.multiplier === 'number' && row.multiplier > 0){
    return row.multiplier;
  }
  const table = GameState.TwoDAManager?.datatables?.get('difficultyopt');
  const optRow = table?.rows?.[difficulty];
  if(optRow){
    const m = parseFloat(String(optRow.multiplier));
    if(Number.isFinite(m) && m > 0) return m;
  }
  return 1;
}

/**
 * Retail CSWRules::GetWeightedDamageAmount(roll, maxDice, pcVsNpc, npcVsPc, percent).
 */
export function getWeightedDamageAmount(
  roll: number,
  maxDice: number,
  pcVsNpc: boolean,
  npcVsPc: boolean,
  percent: number
): number {
  const rolled = roll | 0;
  const max = maxDice | 0;
  const pct = percent | 0;

  if(pcVsNpc){
    if(pct !== 0){
      if(Math.floor((max * pct) / 100) !== max){
        const span = Math.max(1, 100 - pct);
        const mix = ((Math.floor(Math.random() * span) + pct) * max) / 100 + rolled;
        const weighted = Math.floor(mix);
        if(weighted < max) return weighted;
      }
      return max;
    }
  }else if(npcVsPc && pct !== 0){
    if(pct < 100){
      const reduced = rolled - Math.floor(((100 - pct) * max) / 100);
      return reduced < 1 ? 1 : reduced;
    }
    if(pct !== 100){
      const span = Math.max(1, pct - 100);
      return Math.floor((Math.floor(Math.random() * span) * max) / 100) + rolled;
    }
  }
  return rolled;
}

function isPcAttacker(attacker: ModuleCreature): boolean {
  return !!(attacker.isPC || attacker.isPlayer);
}

function isPartyTarget(target: ModuleObject | undefined): boolean {
  if(!target) return false;
  if(typeof (target as ModuleCreature).isPartyMember === 'function'){
    if((target as ModuleCreature).isPartyMember()) return true;
  }
  const party = GameState.PartyManager?.party;
  return Array.isArray(party) && party.indexOf(target as any) >= 0;
}

/**
 * Weight a weapon (or unarmed) dice roll for PC→NPC / NPC→party DiffSettings.
 */
export function weightWeaponDiceRoll(
  roll: number,
  maxDice: number,
  attacker: ModuleCreature,
  target: ModuleObject | undefined
): number {
  if(maxDice <= 0) return roll;

  if(isPcAttacker(attacker) && !isPartyTarget(target)){
    const pct = getDifficultyOption(DiffSettingsOption.MinPCDamagePercent);
    return getWeightedDamageAmount(roll, maxDice, true, false, pct);
  }
  if(!isPcAttacker(attacker) && isPartyTarget(target)){
    const pct = getDifficultyOption(DiffSettingsOption.MaxNPCDamagePercent);
    return getWeightedDamageAmount(roll, maxDice, false, true, pct);
  }
  return roll;
}

/**
 * Retail DoDamage — scale incoming party damage by difficultyopt
 * MULTIPLIER, then DiffSettings MinHP1 floor.
 */
export function applyPartyDifficultyDamage(
  target: ModuleCreature,
  amount: number
): number {
  let dmg = Math.max(0, amount | 0);
  if(!isPartyTarget(target) || dmg <= 0) return dmg;

  const mult = getDifficultyOptMultiplier();
  if(mult !== 1){
    dmg = Math.floor(dmg * mult);
  }

  if(getDifficultyOption(DiffSettingsOption.MinHP1) === 1){
    const hp = typeof target.getHP === 'function' ? target.getHP() : 0;
    if(hp - dmg < 1){
      dmg = Math.max(0, hp - 1);
    }
  }
  return dmg;
}

/** Max weapon dice product (numDice × die) for GetWeightedDamageAmount. */
export function getWeaponMaxDice(weapon: { baseItem?: { numDice?: number; die?: number; dieToRoll?: number } } | undefined): number {
  const bi = weapon?.baseItem;
  if(!bi) return 0;
  const n = bi.numDice | 0;
  const die = (bi.die | 0) || (bi.dieToRoll | 0);
  return n > 0 && die > 0 ? n * die : 0;
}
