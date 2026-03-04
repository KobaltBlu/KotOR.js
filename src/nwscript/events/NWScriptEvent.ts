import { NWScriptEventType } from "@/enums/nwscript/NWScriptEventType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GameState } from "@/GameState";
import { EventActivateItem } from "@/nwscript/events/EventActivateItem";
import { EventConversation } from "@/nwscript/events/EventConversation";
import { EventSpellCastAt } from "@/nwscript/events/EventSpellCastAt";
import { EventUserDefined } from "@/nwscript/events/EventUserDefined";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
// import { ModuleObjectManager } from "@/managers";

/** Object list entries: object id (number) or ModuleObject. */
export type NWScriptObjectListEntry = number | import('@/module/ModuleObject').ModuleObject;

/**
 * NWScriptEvent class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptEvent.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptEvent {
  type: NWScriptEventType;
  intList: number[];
  floatList: number[];
  stringList: string[];
  objectList: NWScriptObjectListEntry[];

  constructor(){
    this.intList = [];
    this.floatList = [];
    this.stringList = [];
    this.objectList = [];
  }

  setIntList(intList: number[] = []){
    if(Array.isArray(intList)){
      this.intList = intList;
    }
  }

  setInt(nOffset = 0, nValue = 0){
    this.intList[nOffset] = nValue;
  }

  getInt(nOffset = 0){
    return this.intList[nOffset];
  }

  setFloatList(floatList: number[] = []){
    if(Array.isArray(floatList)){
      this.floatList = floatList;
    }
  }

  setFloat(nOffset = 0, nValue = 0){
    this.floatList[nOffset] = nValue;
  }

  getFloat(nOffset = 0){
    return this.floatList[nOffset];
  }

  setStringList(stringList: string[] = []){
    if(Array.isArray(stringList)){
      this.stringList = stringList;
    }
  }

  setString(nOffset = 0, nValue = ''){
    this.stringList[nOffset] = nValue;
  }

  getString(nOffset = 0){
    return this.stringList[nOffset];
  }

  setObjectList(objectList: NWScriptObjectListEntry[] = []){
    if(Array.isArray(objectList)){
      this.objectList = objectList;
    }
  }

  setObject(nOffset = 0, nValue?: NWScriptObjectListEntry | { id?: number }): void {
    if(typeof nValue === 'object'){
      nValue = nValue.id;
    }else if(!nValue || (typeof nValue == 'undefined')){
      nValue = undefined;
    }

    this.objectList[nOffset] = nValue;
  }

  getObject(nOffset = 0){
    return (typeof this.objectList[nOffset] === 'object') ? this.objectList[nOffset] : GameState.ModuleObjectManager.GetObjectById(this.objectList[nOffset]);
  }

  save(){

    const eventStruct = new GFFStruct(2);
    eventStruct.addField( new GFFField(GFFDataType.WORD, 'EventType') ).setValue(this.type);

    const intList = eventStruct.addField( new GFFField(GFFDataType.LIST, 'IntList') );
    for(let i = 0; i < this.intList.length; i++){
      const intStruct = new GFFStruct(0x69);
      intStruct.addField( new GFFField(GFFDataType.INT, "Parameter").setValue(this.getInt(i) || 0));
      intList.addChildStruct(intStruct);
    }

    const floatList = eventStruct.addField( new GFFField(GFFDataType.LIST, 'FloatList') );
    for(let i = 0; i < this.floatList.length; i++){
      const floatStruct = new GFFStruct(0x69);
      floatStruct.addField( new GFFField(GFFDataType.FLOAT, "Parameter").setValue(this.getFloat(i) || 0.0));
      floatList.addChildStruct(floatStruct);
    }

    const stringList = eventStruct.addField( new GFFField(GFFDataType.LIST, 'StringList') );
    for(let i = 0; i < this.stringList.length; i++){
      const stringStruct = new GFFStruct(0x69);
      stringStruct.addField( new GFFField(GFFDataType.CEXOSTRING, "Parameter").setValue(this.getString(i) || ''));
      stringList.addChildStruct(stringStruct);
    }

    const objectList = eventStruct.addField( new GFFField(GFFDataType.LIST, 'ObjectList') );
    for(let i = 0; i < this.objectList.length; i++){
      const objectStruct = new GFFStruct(0x69);
      objectStruct.addField( new GFFField(GFFDataType.DWORD, "Parameter").setValue( typeof this.getObject(i) === 'object' ? this.getObject(i).id : 2130706432 ));
      objectList.addChildStruct(objectStruct);
    }

    return eventStruct;

  }

}
