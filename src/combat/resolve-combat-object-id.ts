import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module";

/**
 * Resolve a saved CombatRound / AttackList object id.
 * Retail LoadCombatRound stores DWORDs and looks them up when used;
 * KotOR.js may call this during fromStruct (early) and again after all
 * creatures are registered.
 */
export function lookupCombatObjectById(id: number): ModuleObject | undefined {
  if(!id || id === ModuleObjectConstant.OBJECT_INVALID){
    return undefined;
  }
  try{
    return GameState.ModuleObjectManager?.GetObjectById?.(id);
  }catch{
    return undefined;
  }
}

/**
 * Normalize a GFF object id for deferred resolve (0 / INVALID → 0).
 */
export function normalizeCombatObjectId(id: number): number {
  if(!id || id === ModuleObjectConstant.OBJECT_INVALID){
    return 0;
  }
  return id;
}
