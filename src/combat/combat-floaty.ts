import type { ModuleObject } from "@/module";
import { GameState } from "@/GameState";
import { FeedbackOption } from "@/enums/engine/FeedbackOption";

/**
 * Retail OnApplyDamage / SignalMeleeDamage floaty gate:
 * AddFloatyText only when attacker/damager is GetPlayerCreatureId.
 * DEBUG_COMBAT_FLOATY_ALL_ATTACKERS restores pre-alignment (any attacker).
 */
export function shouldShowCombatFloaty(attacker: ModuleObject | undefined): boolean {
  if(!attacker) return false;
  if(!GameState.FeedbackMessageManager.GetFeedbackTypeEnabled(FeedbackOption.FloatingNumbers)){
    return false;
  }
  if(GameState.DEBUG_COMBAT_FLOATY_ALL_ATTACKERS){
    return true;
  }
  const player = GameState.getCurrentPlayer();
  return !!player && attacker === player;
}
