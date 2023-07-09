import { NWScriptEventType } from "../../enums/nwscript/NWScriptEventType";
import { GFFDataType } from "../../enums/resource/GFFDataType";
import { GFFField } from "../../resource/GFFField";
import { GFFStruct } from "../../resource/GFFStruct";
import { EventActivateItem, EventConversation, EventSpellCastAt, EventUserDefined } from ".";
import { ModuleObjectManager } from "../../managers";

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
    return (typeof this.objectList[nOffset] === 'object') ? this.objectList[nOffset] : ModuleObjectManager.GetObjectById(this.objectList[nOffset]);
  }

  static EventFromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let event = undefined;

      let eType = struct.getFieldByLabel('EventType').getValue();

      let intList = [];
      let floatList = [];
      let stringList = [];
      let objectList = [];

      let tmpList = struct.getFieldByLabel('IntList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        intList[i] = tmpList[i].getFieldByLabel('Parameter').getValue();
      }

      tmpList = struct.getFieldByLabel('FloatList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        floatList[i] = tmpList[i].getFieldByLabel('Parameter').getValue();
      }

      tmpList = struct.getFieldByLabel('StringList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        stringList[i] = tmpList[i].getFieldByLabel('Parameter').getValue();
      }

      tmpList = struct.getFieldByLabel('ObjectList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        objectList[i] = tmpList[i].getFieldByLabel('Parameter').getValue();
      }

      //Initialize the event object based on the type
      switch(eType){
        case NWScriptEventType.EventConversation: //EventConversation
          event = new EventConversation();
        break;
        case NWScriptEventType.EventSpellCastAt: //EventSpellCastAt
          event = new EventSpellCastAt();
        break;
        case NWScriptEventType.EventUserDefined: //EventUserDefined
          event = new EventUserDefined();
        break;
        case NWScriptEventType.EventActivateItem: //EventActivateItem
          event = new EventActivateItem();
        break;
      }

      if(event instanceof NWScriptEvent){
        event.setIntList(intList);
        event.setFloatList(floatList);
        event.setStringList(stringList);
        event.setObjectList(objectList);
        console.log('NWScriptEvent', event, struct);
      }else{
        console.log('NWScriptEvent', event, struct);
      }

      return event;

    }

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
