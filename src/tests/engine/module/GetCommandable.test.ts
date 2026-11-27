import { GameObjectType } from "@core/enums/module/GameObjectType";
import { NW_FALSE, NW_TRUE } from "@core/nwscript/NWScriptConstants";

/**
 * Mirrors NWScript GetCommandable — must accept placeables/doors, not only creatures.
 * (Deadeye win: k_ptar_invis_speaker OnDialog → k_ai_master requires GetCommandable.)
 */
function getCommandable(obj: any): number {
  if(!obj || typeof obj !== 'object'){
    return NW_FALSE;
  }
  // GameObject bit present
  if(typeof obj.objectType === 'number'){
    const isObj = (obj.objectType & GameObjectType.GameObject) === GameObjectType.GameObject;
    if(!isObj) return NW_FALSE;
  }
  if(typeof obj.getCommadable === 'function'){
    return obj.getCommadable() ? NW_TRUE : NW_FALSE;
  }
  return obj.commandable ? NW_TRUE : NW_FALSE;
}

describe('GetCommandable placeable / creature parity', () => {
  it('returns true for a commandable placeable', () => {
    const placeable = {
      objectType: GameObjectType.GameObject | GameObjectType.Placeable,
      commandable: true,
      getCommadable(){ return !!this.commandable; },
    };
    expect(getCommandable(placeable)).toBe(NW_TRUE);
  });

  it('returns false for a non-commandable placeable', () => {
    const placeable = {
      objectType: GameObjectType.GameObject | GameObjectType.Placeable,
      commandable: false,
      getCommadable(){ return !!this.commandable; },
    };
    expect(getCommandable(placeable)).toBe(NW_FALSE);
  });

  it('uses creature getCommadable / isCommandable', () => {
    const cre = {
      objectType: GameObjectType.GameObject | GameObjectType.Creature,
      isCommandable: true,
      getCommadable(){ return this.isCommandable; },
    };
    expect(getCommandable(cre)).toBe(NW_TRUE);
    cre.isCommandable = false;
    expect(getCommandable(cre)).toBe(NW_FALSE);
  });
});
