
import { GameState } from "@engine/runtime/GameState";
import type { ModuleObject } from "@engine/module/ModuleObject";
import type { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { GFFStruct } from "@core/resource/GFFStruct";

import { isObject } from "@engine/module/guards/isObject";

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
    this.callerId = isObject(this.caller) ? this.caller.id : 0;
    return this.caller;
  }

  getCaller(){
    return isObject(this.caller) ? this.caller : this.setCaller(GameState.ModuleObjectManager.GetObjectById(this.callerId));
  }

  setObjectId(nObjectId: number){
    this.objectId = nObjectId;
  }

  setObject(obj: ModuleObject){
    this.object = obj;
    this.objectId = isObject(this.object) ? this.object.id : 0;
    return this.object;
  }

  getObject(){
    return isObject(this.object) ? this.object : this.setObject(GameState.ModuleObjectManager.GetObjectById(this.objectId));
  }

  /** OBJECT_INVALID / sentinel used in event-queue GFF. */
  static readonly INVALID_OBJECT_ID = 2130706432;

  /** Persist CallerId for event-queue save (script caller, else event caller). */
  exportCallerId(): number {
    if(isObject(this.script?.caller)){
      return this.script.caller.id;
    }
    if(isObject(this.caller)){
      return this.caller.id;
    }
    if((this.callerId | 0) !== 0){
      return this.callerId | 0;
    }
    return GameEvent.INVALID_OBJECT_ID;
  }

  /** Persist ObjectId for event-queue save (script object, else event object). */
  exportObjectId(): number {
    if(isObject(this.script?.object)){
      return this.script.object.id;
    }
    if(isObject(this.object)){
      return this.object.id;
    }
    if((this.objectId | 0) !== 0){
      return this.objectId | 0;
    }
    return GameEvent.INVALID_OBJECT_ID;
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
