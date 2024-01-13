import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { GFFDataType } from "../../enums/resource/GFFDataType";
import { GFFField } from "../../resource/GFFField";
import { GFFStruct } from "../../resource/GFFStruct";
import { GameState } from "../../GameState";
import { EventConversation } from "./EventConversation";
import { EventSpellCastAt } from "./EventSpellCastAt";
import { EventUserDefined } from "./EventUserDefined";
import { EventActivateItem } from "./EventActivateItem";
// import { ModuleObjectManager } from "../../managers";

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
  intList: any[];
  floatList: any[];
  stringList: any[];
  objectList: any[];

  constructor(){
    this.intList = [];
    this.floatList = [];
    this.stringList = [];
    this.objectList = [];
  }

  setIntList(intList: any[] = []){
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

  setFloatList(floatList: any[] = []){
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

  setStringList(stringList: any[] = []){
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

  setObjectList(objectList: any[] = []){
    if(Array.isArray(objectList)){
      this.objectList = objectList;
    }
  }

  setObject(nOffset = 0, nValue?: any){
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

    let eventStruct = new GFFStruct(2);
    eventStruct.addField( new GFFField(GFFDataType.WORD, 'EventType') ).setValue(this.type);

    let intList = eventStruct.addField( new GFFField(GFFDataType.LIST, 'IntList') );
    for(let i = 0; i < this.intList.length; i++){
      let intStruct = new GFFStruct(0x69);
      intStruct.addField( new GFFField(GFFDataType.INT, "Parameter").setValue(this.getInt(i) || 0));
      intList.addChildStruct(intStruct);
    }

    let floatList = eventStruct.addField( new GFFField(GFFDataType.LIST, 'FloatList') );
    for(let i = 0; i < this.floatList.length; i++){
      let floatStruct = new GFFStruct(0x69);
      floatStruct.addField( new GFFField(GFFDataType.FLOAT, "Parameter").setValue(this.getFloat(i) || 0.0));
      floatList.addChildStruct(floatStruct);
    }

    let stringList = eventStruct.addField( new GFFField(GFFDataType.LIST, 'StringList') );
    for(let i = 0; i < this.stringList.length; i++){
      let stringStruct = new GFFStruct(0x69);
      stringStruct.addField( new GFFField(GFFDataType.CEXOSTRING, "Parameter").setValue(this.getString(i) || ''));
      stringList.addChildStruct(stringStruct);
    }

    let objectList = eventStruct.addField( new GFFField(GFFDataType.LIST, 'ObjectList') );
    for(let i = 0; i < this.objectList.length; i++){
      let objectStruct = new GFFStruct(0x69);
      objectStruct.addField( new GFFField(GFFDataType.DWORD, "Parameter").setValue( typeof this.getObject(i) === 'object' ? this.getObject(i).id : 2130706432 ));
      objectList.addChildStruct(objectStruct);
    }

    return eventStruct;

  }

}
