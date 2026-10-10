import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import { GameState } from "@engine/runtime/GameState";
import type { GameObject } from "@engine/module/GameObject";

/**
 * Resolve a saved CombatRound / AttackList object id.
 * LoadCombatRound stores DWORDs and looks them up when used;
 * KotOR.js may call this during fromStruct (early) and again after all
 * creatures are registered.
 */
export function lookupCombatObjectById(id: number): GameObject | undefined {
  if(!id || id === GameObjectConstant.OBJECT_INVALID){
    return undefined;
  }
  try{
    const mom = GameState.GameObjectManager;
    return (
      mom?.GetClientObjectById?.(id) ||
      mom?.GetObjectById?.(id)
    );
  }catch{
    return undefined;
  }
}

/**
 * Normalize a GFF object id for deferred resolve (0 / INVALID → 0).
 */
export function normalizeCombatObjectId(id: number): number {
  if(!id || id === GameObjectConstant.OBJECT_INVALID){
    return 0;
  }
  return id;
}
