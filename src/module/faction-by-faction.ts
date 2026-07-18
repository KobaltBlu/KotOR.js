import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleArea, ModuleCreature, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";

/**
 * Resolve the area used by ExecuteCommandChangeByFaction @ 00546340.
 * Caller may be a creature/object (→ GetArea) or the area itself.
 */
export function resolveCallerArea(caller: ModuleObject | undefined): ModuleArea | undefined {
  if(!caller) return undefined;
  if(BitWise.InstanceOfObject(caller, ModuleObjectType.ModuleArea)){
    return caller as ModuleArea;
  }
  return caller.area;
}

/**
 * Retail ExecuteCommandChangeByFaction @ 00546340 —
 * ChangeFactionByFaction / SurrenderByFaction.
 *
 * All creatures in the caller's area whose FactionID matches `fromFactionId`
 * join `toFactionId`. Surrender also clears combat/actions and pacifies.
 */
export function changeFactionByFaction(
  caller: ModuleObject | undefined,
  fromFactionId: number,
  toFactionId: number,
  surrender: boolean = false,
): void {
  const area = resolveCallerArea(caller);
  if(!area?.creatures?.length) return;

  const toFaction = GameState.FactionManager.factions.get(toFactionId);
  if(!toFaction) return;

  for(let i = 0; i < area.creatures.length; i++){
    const creature = area.creatures[i] as ModuleCreature;
    if(!creature) continue;

    const factionId = creature.faction?.id ?? creature.factionId;
    if(factionId !== fromFactionId) continue;

    creature.faction = toFaction;
    creature.factionId = toFactionId;
    GameState.FactionManager.AddCreatureToFaction(creature);

    if(surrender){
      // SetCombatState(0, 1), ClearAllActions(1), PacifyCreature
      creature.setCombatState(false);
      creature.clearAllActions(true);
      creature.pacifyCreature();
    }else{
      // ClearVisibleList + UpdateVisibleList(0)
      creature.clearVisibleList();
    }
  }
}
