
import { GameState } from "../GameState";
import { ModuleObjectType } from "../enums";
import type { ModuleObject } from "../module/ModuleObject";
import type { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFStruct } from "../resource/GFFStruct";
import { BitWise } from "../utility/BitWise";

/**
 * GameEvent class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameEvent.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GameEvent {

  id: number = 0;
  initialized: boolean = false;
  type = 0;
  caller: ModuleObject;
  object: ModuleObject;
  day: number;
  time: number;
  callerId: number;
  objectId: number;
  script: NWScriptInstance;

  setDay(nDay: number){
    this.day = nDay;
  }

  setTime(nTime: number){
    this.time = nTime;
  }

  setCallerId(nCallerId: number){
    this.callerId = nCallerId;
  }

  setCaller(caller: ModuleObject){
    this.caller = caller;
    this.callerId = BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject) ? this.caller.id : 0;
    return this.caller;
  }

  getCaller(){
    return BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject) ? this.caller : this.setCaller(GameState.ModuleObjectManager.GetObjectById(this.callerId));
  }

  setObjectId(nObjectId: number){
    this.objectId = nObjectId;
  }

  setObject(obj: ModuleObject){
    this.object = obj;
    this.objectId = BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleObject) ? this.object.id : 0;
    return this.object;
  }

  getObject(){
    return BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleObject) ? this.object : this.setObject(GameState.ModuleObjectManager.GetObjectById(this.objectId));
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      return;
    }
  }

  execute(){

  }

  export(): any {
    return undefined;
  }

}
