import { FollowerCamera } from "@/engine/FollowerCamera";
import { GameState } from "@/GameState";

/**
 * Retail ExcitedDuration.2da row indices (SetExcitedState).
 * DURATION column is remaining timer in milliseconds; only applied when greater than current.
 */
export enum ExcitedDurationRow {
  None = 0,
  Damage = 1,
  SpellCast = 2,
}

/** Retail SetCombatState(true) always refreshes the combat timer to 8000ms. */
export const COMBAT_STATE_DURATION_MS = 8000;

/** Fallback ExcitedDuration.2da DURATION values when 2DA missing. */
const EXCITED_DURATION_FALLBACK_MS: Record<number, number> = {
  [ExcitedDurationRow.None]: 0,
  [ExcitedDurationRow.Damage]: 10000,
  [ExcitedDurationRow.SpellCast]: 10000,
};

/**
 * Look up ExcitedDuration.2da DURATION for a row (ms).
 */
export function getExcitedDurationMs(row: number): number {
  const table = GameState.TwoDAManager?.datatables?.get('excitedduration');
  if(table){
    const entry = typeof table.getByID === 'function' ? table.getByID(row) : table.rows?.[row];
    if(entry){
      const raw = entry.duration ?? entry.DURATION;
      const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
      if(Number.isFinite(n) && n >= 0) return n;
    }
  }
  return EXCITED_DURATION_FALLBACK_MS[row] ?? 0;
}

/** Minimal shape for client combat-mode helpers (avoids ModuleCreature import cycle). */
export type ClientCombatModeCreature = {
  clientCombatMode?: boolean;
  combatData?: {
    lastAttackTarget?: { isDead?: () => boolean } | null;
    lastAttemptedAttackTarget?: { isDead?: () => boolean } | null;
    lastSpellTarget?: { isDead?: () => boolean } | null;
    lastAttemptedSpellTarget?: { isDead?: () => boolean } | null;
  };
  combatRound?: {
    newAttackTarget?: { isDead?: () => boolean } | null;
  };
};

function isLivingCombatOid(target: { isDead?: () => boolean } | null | undefined): boolean {
  if(!target){
    return false;
  }
  if(typeof target.isDead === 'function' && target.isDead()){
    return false;
  }
  return true;
}

/**
 * Retail UpdateCombatMode living-target checks (attack / spell / sticky oid).
 * Corpses fail GetDead and do not keep client combat mode active.
 */
export function hasLivingCombatTarget(creature: ClientCombatModeCreature | undefined | null): boolean {
  if(!creature?.combatData){
    return false;
  }
  const data = creature.combatData;
  if(isLivingCombatOid(data.lastAttackTarget)) return true;
  if(isLivingCombatOid(data.lastAttemptedAttackTarget)) return true;
  if(isLivingCombatOid(data.lastSpellTarget)) return true;
  if(isLivingCombatOid(data.lastAttemptedSpellTarget)) return true;
  if(isLivingCombatOid(creature.combatRound?.newAttackTarget)) return true;
  return false;
}

/**
 * Retail CSWCCreature::SetCombatMode(0/1).
 * Per-creature bit; when the creature is the controlled PC, also sets
 * CClientExoApp combat_mode (camera + overlay ShowActionQueue).
 */
export function setClientCombatMode(
  creature: ClientCombatModeCreature | undefined | null,
  on: boolean
): void {
  if(!creature){
    return;
  }
  const next = !!on;
  creature.clientCombatMode = next;
  // Retail: only the controlled PC updates CClientExoApp::combat_mode + camera.
  if(creature === GameState.getCurrentPlayer?.()){
    FollowerCamera.setCombatCameraActive(next);
  }
}

/**
 * Retail UpdateCombatMode (creature living-target path).
 * On while living attack/spell targets exist; off when none remain.
 */
export function updateClientCombatMode(
  creature: ClientCombatModeCreature | undefined | null
): void {
  if(!creature){
    return;
  }
  if(hasLivingCombatTarget(creature)){
    setClientCombatMode(creature, true);
    return;
  }
  if(creature.clientCombatMode){
    setClientCombatMode(creature, false);
  }
}

/**
 * Retail CClientExoApp::GetCombatMode — controlled PC client combat-mode bit.
 */
export function getClientCombatMode(): boolean {
  const pc = GameState.getCurrentPlayer?.();
  return !!(pc as ClientCombatModeCreature | undefined)?.clientCombatMode;
}
