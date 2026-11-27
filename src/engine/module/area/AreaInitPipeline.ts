import type { Area } from "@engine/module/Area";
import { GameObject } from "@engine/module/GameObject";
import {
  getDefaultAreaLoadContext,
  type AreaLoadContext,
} from "@engine/module/area/AreaLoadContext";

/**
 * Post-scene OnSpawn pass and area start scripts.
 * Party receives an explicit second spawn pass after area creatures.
 */
export class AreaInitPipeline {
  /**
   * Post-load OnSpawn pass — iterate types in GIT load order.
   * Only creatures (and party) currently run spawn scripts; other types call
   * onSpawn for init side-effects without inventing non- script slots.
   */
  static async initAreaObjects(
    area: Area,
    runSpawnScripts = false,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    for(let i = 0; i < area.creatures.length; i++){
      if(area.creatures[i] instanceof GameObject){
        area.creatures[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < area.items.length; i++){
      if(area.items[i] instanceof GameObject){
        area.items[i].onSpawn(false);
      }
    }

    for(let i = 0; i < area.doors.length; i++){
      if(area.doors[i] instanceof GameObject){
        area.doors[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < area.triggers.length; i++){
      if(area.triggers[i] instanceof GameObject){
        area.triggers[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < area.encounters.length; i++){
      if(area.encounters[i] instanceof GameObject){
        area.encounters[i].onSpawn(false);
      }
    }

    for(let i = 0; i < area.waypoints.length; i++){
      if(area.waypoints[i] instanceof GameObject){
        area.waypoints[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < area.sounds.length; i++){
      if(area.sounds[i] instanceof GameObject){
        area.sounds[i].onSpawn(false);
      }
    }

    for(let i = 0; i < area.placeables.length; i++){
      if(area.placeables[i] instanceof GameObject){
        area.placeables[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < area.stores.length; i++){
      if(area.stores[i] instanceof GameObject){
        area.stores[i].onSpawn(false);
      }
    }

    for(let i = 0; i < area.areaOfEffects.length; i++){
      if(area.areaOfEffects[i] instanceof GameObject){
        area.areaOfEffects[i].onSpawn(false);
      }
    }

    const party = context.getPartyManager().party;
    for(let i = 0; i < party.length; i++){
      if(party[i] instanceof GameObject){
        party[i].onSpawn(runSpawnScripts);
      }
    }

    if(area.miniGame){
      area.miniGame.initMiniGameObjects();
    }

    this.runStartScripts(area);
  }

  static async runStartScripts(area: Area): Promise<void> {
    if(area.miniGame) area.miniGame.runMiniGameScripts();
    area.runOnEnterScripts();
  }
}
