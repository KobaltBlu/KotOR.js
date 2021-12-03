class NWScriptEvent {

  constructor(){
    this.intList = [];
    this.floatList = [];
    this.stringList = [];
    this.objectList = [];
  }

  setIntList(intList = []){
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

  setFloatList(floatList = []){
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

  setStringList(stringList = []){
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

  setObjectList(objectList = []){
    if(Array.isArray(objectList)){
      this.objectList = objectList;
    }
  }

  setObject(nOffset = 0, nValue = undefined){
    if(nValue instanceof ModuleObject){
      nValue = nValue.id;
    }else if(!nValue || (typeof nValue == 'undefined')){
      nValue = undefined;
    }

    this.objectList[nOffset] = nValue;
  }

  getObject(nOffset = 0){
    return (this.objectList[nOffset] instanceof ModuleObject) ? this.objectList[nOffset] : ModuleObject.GetObjectById(this.objectList[nOffset]);
  }

  static EventFromStruct( struct = undefined ){
    if(struct instanceof Struct){
      let event = undefined;

      let eType = struct.GetFieldByLabel('EventType').GetValue();

      let intList = [];
      let floatList = [];
      let stringList = [];
      let objectList = [];

      let tmpList = struct.GetFieldByLabel('IntList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        intList[i] = tmpList[i].GetFieldByLabel('Parameter').GetValue();
      }

      tmpList = struct.GetFieldByLabel('FloatList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        floatList[i] = tmpList[i].GetFieldByLabel('Parameter').GetValue();
      }

      tmpList = struct.GetFieldByLabel('StringList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        stringList[i] = tmpList[i].GetFieldByLabel('Parameter').GetValue();
      }

      tmpList = struct.GetFieldByLabel('ObjectList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        objectList[i] = tmpList[i].GetFieldByLabel('Parameter').GetValue();
      }

      //Initialize the event object based on the type
      switch(eType){
        case NWScriptEvent.Type.EventConversation: //EventConversation
          event = new EventConversation();
        break;
        case NWScriptEvent.Type.EventSpellCastAt: //EventSpellCastAt
          event = new EventSpellCastAt();
        break;
        case NWScriptEvent.Type.EventUserDefined: //EventUserDefined
          event = new EventUserDefined();
        break;
        case NWScriptEvent.Type.EventActivateItem: //EventActivateItem
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

    let eventStruct = new Struct(2);
    eventStruct.AddField( new Field(GFFDataTypes.WORD, 'EventType') ).SetValue(this.type);

    let intList = eventStruct.AddField( new Field(GFFDataTypes.LIST, 'IntList') );
    for(let i = 0; i < this.intList.length; i++){
      let intStruct = new Struct(0x69);
      intStruct.AddField( new Field(GFFDataTypes.INT, "Parameter").SetValue(this.getInt(i) || 0));
      intList.AddChildStruct(intStruct);
    }

    let floatList = eventStruct.AddField( new Field(GFFDataTypes.LIST, 'FloatList') );
    for(let i = 0; i < this.floatList.length; i++){
      let floatStruct = new Struct(0x69);
      floatStruct.AddField( new Field(GFFDataTypes.FLOAT, "Parameter").SetValue(this.getFloat(i) || 0.0));
      floatList.AddChildStruct(floatStruct);
    }

    let stringList = eventStruct.AddField( new Field(GFFDataTypes.LIST, 'StringList') );
    for(let i = 0; i < this.stringList.length; i++){
      let stringStruct = new Struct(0x69);
      stringStruct.AddField( new Field(GFFDataTypes.CEXOSTRING, "Parameter").SetValue(this.getString(i) || ''));
      stringList.AddChildStruct(stringStruct);
    }

    let objectList = eventStruct.AddField( new Field(GFFDataTypes.LIST, 'ObjectList') );
    for(let i = 0; i < this.objectList.length; i++){
      let objectStruct = new Struct(0x69);
      objectStruct.AddField( new Field(GFFDataTypes.DWORD, "Parameter").SetValue( this.getObject(i) instanceof ModuleObject ? this.getObject(i).id : 2130706432 ));
      objectList.AddChildStruct(objectStruct);
    }

    return eventStruct;

  }



}

//------------------//
// NWScriptEvent Types
//------------------//

NWScriptEvent.Type = {
  EventSpellCastAt:                 0x02,
  EventConversation:                0x07,
  EventUserDefined:                 0x0B,
  EventActivateItem:                0x12,
};

module.exports = NWScriptEvent;