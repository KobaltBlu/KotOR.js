import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject, ModuleArea, ModuleDoor, ModuleEncounter, ModuleItem, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModulePlaceable, ModuleSound, ModuleStore, ModuleTrigger } from "@/module";
import type { TalentObject } from "@/talents/TalentObject";
import type { GameEffect } from "@/effects/GameEffect";
import type { GameEvent } from "@/events/GameEvent";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #405: upstream-body-changed. */
export const GetIsDay: INWScriptDefAction = {
    comment: "405: * Returns TRUE if it is currently day.\n",
    name: "GetIsDay",
    type: NWScriptDataType.INTEGER,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      const module = GameState.module;
      if(!module || !module.timeManager) return NW_FALSE;
      const hour = module.timeManager.hour;
      return (hour > module.dawnHour && hour < module.duskHour) ? NW_TRUE : NW_FALSE;
    }
  };

/** Upstream 002dfe03, action #406: upstream-body-changed. */
export const GetIsNight: INWScriptDefAction = {
    comment: "406: * Returns TRUE if it is currently night.\n",
    name: "GetIsNight",
    type: NWScriptDataType.INTEGER,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      const module = GameState.module;
      if(!module || !module.timeManager) return NW_FALSE;
      const hour = module.timeManager.hour;
      return (hour > module.duskHour || hour < module.dawnHour) ? NW_TRUE : NW_FALSE;
    }
  };

/** Upstream 002dfe03, action #407: upstream-body-changed. */
export const GetIsDawn: INWScriptDefAction = {
    comment: "407: * Returns TRUE if it is currently dawn.\n",
    name: "GetIsDawn",
    type: NWScriptDataType.INTEGER,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      const module = GameState.module;
      if(!module || !module.timeManager) return NW_FALSE;
      return (module.timeManager.hour == module.dawnHour) ? NW_TRUE : NW_FALSE;
    }
  };

/** Upstream 002dfe03, action #408: upstream-body-changed. */
export const GetIsDusk: INWScriptDefAction = {
    comment: "408: * Returns TRUE if it is currently dusk.\n",
    name: "GetIsDusk",
    type: NWScriptDataType.INTEGER,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      const module = GameState.module;
      if(!module || !module.timeManager) return NW_FALSE;
      return (module.timeManager.hour == module.duskHour) ? NW_TRUE : NW_FALSE;
    }
  };
